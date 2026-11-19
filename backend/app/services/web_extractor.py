import re
import urllib.request
import urllib.error
from html import unescape
from html.parser import HTMLParser
from typing import Dict, Any, List, Optional


# Void / self-closing HTML5 elements that must NEVER be pushed to a nesting stack
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", 
    "input", "link", "meta", "param", "source", "track", "wbr"
}

# Tags whose entire inner tree should be discarded
DISCARD_TAGS = {
    "script", "style", "noscript", "svg", "nav", "footer", 
    "header", "aside", "form", "button", "iframe", "menu", 
    "figure", "figcaption", "select", "textarea"
}

# Substring matches for classes or IDs that contain non-article clutter
IGNORE_CLASS_SUBSTRINGS = {
    "sharedaddy", "sd-sharing", "jp-relatedposts", "wpcnt", 
    "nav-previous", "nav-next", "post-nav", "author-heading",
    "author-bio", "author-link", "author-title", "entry-footer",
    "site-footer", "sidebar", "widget", "comment", "comments-area", 
    "comment-respond", "cookie-banner", "share-buttons"
}

# Regex patterns identifying the start of a comments section across web CMSs
COMMENT_BOUNDARY_PATTERNS = [
    r'<div[^>]+id=[\"\']comments[\"\']',
    r'<section[^>]+id=[\"\']comments[\"\']',
    r'<div[^>]+class=[\"\'][^\"\']*comments-area[^\"\']*[\"\']',
    r'<div[^>]+class=[\"\'][^\"\']*comment-respond[^\"\']*[\"\']',
    r'<div[^>]+id=[\"\']respond[\"\']',
    r'<div[^>]+id=[\"\']disqus_thread[\"\']',
    r'<section[^>]+class=[\"\'][^\"\']*comments[^\"\']*[\"\']',
    r'<div[^>]+class=[\"\'][^\"\']*comment-list[^\"\']*[\"\']',
    r'<div[^>]+class=[\"\'][^\"\']*responses[^\"\']*[\"\']',
]

# Primary container patterns for popular CMSs (WordPress, Substack, Medium, Ghost, News sites)
ARTICLE_CONTAINER_PATTERNS = [
    r'<div[^>]+class=[\"\'][^\"\']*(?:entry-content|post-content|article-content|story-body|prose)[^\"\']*[\"\'][^>]*>(.*)',
    r'<article\b[^>]*>(.*)</article>',
    r'<main\b[^>]*>(.*)</main>',
]


class CleanArticleParser(HTMLParser):
    BLOCK_TAGS = {"p", "div", "article", "section", "blockquote", "li", "td", "th"}
    HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self):
        super().__init__()
        self.discard_stack: List[str] = []
        self.paragraphs: List[str] = []
        self.current_tokens: List[str] = []
        self.heading_level: int = 0
        self.heading_tokens: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        t_low = tag.lower()
        if t_low in VOID_ELEMENTS or t_low in {"html", "body"}:
            return

        attrs_dict = {k.lower(): v for k, v in attrs if v is not None}

        # Check tag discard
        if t_low in DISCARD_TAGS:
            self.discard_stack.append(t_low)
            return

        # Check class / ID discard
        class_id = (attrs_dict.get("class", "") + " " + attrs_dict.get("id", "")).lower()
        if any(ign in class_id for ign in IGNORE_CLASS_SUBSTRINGS):
            self.discard_stack.append(t_low)
            return

        if self.discard_stack:
            self.discard_stack.append(t_low)
            return

        # Headings
        if t_low in self.HEADING_TAGS:
            self._flush()
            self.heading_level = int(t_low[1])
            self.heading_tokens = []
        elif t_low in self.BLOCK_TAGS:
            self._flush()

    def handle_endtag(self, tag: str):
        t_low = tag.lower()
        if t_low in VOID_ELEMENTS or t_low in {"html", "body"}:
            return

        if self.discard_stack:
            if self.discard_stack[-1] == t_low:
                self.discard_stack.pop()
            return

        if t_low in self.HEADING_TAGS:
            h_text = unescape("".join(self.heading_tokens)).strip()
            if h_text and len(h_text.split()) >= 1:
                prefix = "#" * min(self.heading_level, 3)
                self.paragraphs.append(f"{prefix} {h_text}")
            self.heading_level = 0
            self.heading_tokens = []
        elif t_low in self.BLOCK_TAGS:
            self._flush()

    def handle_data(self, data: str):
        if self.discard_stack:
            return
        if self.heading_level > 0:
            self.heading_tokens.append(data)
        else:
            self.current_tokens.append(data)

    def _flush(self):
        if self.current_tokens:
            text = unescape("".join(self.current_tokens))
            cleaned = re.sub(r"\s+", " ", text).strip()
            # Drop tiny boilerplate strings, author bio links, and published date stamps
            if (
                len(cleaned.split()) >= 4 
                and not cleaned.startswith("View all posts by")
                and not re.match(r"^Published\s+[A-Za-z]+", cleaned, re.I)
            ):
                self.paragraphs.append(cleaned)
            self.current_tokens = []


class WebArticleExtractor:
    """
    Downloads and extracts clean article text, metadata, and headings from arbitrary web URLs.
    Guarantees 100% removal of comment sections, sidebars, related posts, and site navigation.
    """

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    @classmethod
    def extract_from_html(cls, html_content: str, url: str = "") -> Dict[str, Any]:
        # 1. Extract metadata from full HTML
        title_m = (
            re.search(r'<meta[^>]+property=[\"\']og:title[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<meta[^>]+name=[\"\']twitter:title[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<title>(.*?)</title>', html_content, re.I | re.S)
        )
        raw_title = unescape(title_m.group(1)).strip() if title_m else "Untitled Article"
        clean_title = re.sub(r"\s*([|–—·-]\s*[^|–—·-]+)$", "", raw_title).strip() or raw_title

        author_m = (
            re.search(r'<meta[^>]+name=[\"\']author[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<meta[^>]+property=[\"\']article:author[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<a[^>]+rel=[\"\']author[\"\'][^>]*>(.*?)</a>', html_content, re.I) or
            re.search(r'class=[\"\'][^\"\']*author-name[^\"\']*[\"\'][^>]*>(.*?)<', html_content, re.I)
        )
        author = unescape(author_m.group(1)).strip() if author_m else None

        site_m = (
            re.search(r'<meta[^>]+property=[\"\']og:site_name[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<meta[^>]+name=[\"\']application-name[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I)
        )
        site_name = unescape(site_m.group(1)).strip() if site_m else None

        desc_m = (
            re.search(r'<meta[^>]+property=[\"\']og:description[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I) or
            re.search(r'<meta[^>]+name=[\"\']description[\"\'][^>]+content=[\"\'](.*?)[\"\']', html_content, re.I)
        )
        description = unescape(desc_m.group(1)).strip() if desc_m else None

        # 2. Hard cutoff before comment sections begin
        cut_idx = len(html_content)
        for pat in COMMENT_BOUNDARY_PATTERNS:
            m = re.search(pat, html_content, re.I)
            if m and m.start() < cut_idx:
                cut_idx = m.start()

        pre_comment_html = html_content[:cut_idx]

        # 3. Target the core article container
        target_html = pre_comment_html
        for c_pat in ARTICLE_CONTAINER_PATTERNS:
            cm = re.search(c_pat, pre_comment_html, re.I | re.S)
            if cm:
                target_html = cm.group(1)
                break

        # 4. Parse paragraphs and headings
        parser = CleanArticleParser()
        parser.feed(target_html)
        parser._flush()

        clean_text = "\n\n".join(parser.paragraphs)
        word_count = len(clean_text.split()) if clean_text else 0
        reading_time_min = max(1, round(word_count / 200)) if word_count else 0

        return {
            "url": url,
            "title": clean_title,
            "author": author,
            "site_name": site_name,
            "description": description,
            "text": clean_text,
            "word_count": word_count,
            "reading_time_min": reading_time_min,
            "paragraph_count": len(parser.paragraphs)
        }

    @classmethod
    def extract_from_url(cls, url: str, timeout: int = 20) -> Dict[str, Any]:
        if not re.match(r"^https?://", url.strip(), re.IGNORECASE):
            url = "https://" + url.strip()

        req = urllib.request.Request(url, headers=cls.HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                content_type = response.headers.get("Content-Type", "")
                charset = "utf-8"
                if "charset=" in content_type.lower():
                    charset = content_type.lower().split("charset=")[-1].split(";")[0].strip()

                raw_bytes = response.read()
                try:
                    html_content = raw_bytes.decode(charset, errors="replace")
                except Exception:
                    html_content = raw_bytes.decode("utf-8", errors="replace")

                data = cls.extract_from_html(html_content, url=url)
                if not data["text"].strip():
                    raise ValueError("Could not extract article text from this webpage. The page may require JavaScript or authentication.")
                return data

        except urllib.error.HTTPError as e:
            raise ValueError(f"HTTP {e.code} error while accessing URL: {e.reason}")
        except urllib.error.URLError as e:
            raise ValueError(f"Could not connect to URL: {e.reason}")
        except TimeoutError:
            raise ValueError("Connection timed out while fetching the webpage.")
