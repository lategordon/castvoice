import re
import urllib.request
import urllib.error
from html.parser import HTMLParser
from typing import Dict, Any, List, Optional


class ArticleHTMLParser(HTMLParser):
    """
    Standard-library HTML parser that strips non-content tags (scripts, styles,
    navbars, footers, forms) and extracts clean readable article prose, headings,
    and metadata.
    """

    # Tags whose inner text should be completely discarded
    DISCARD_TAGS = {
        "script", "style", "noscript", "svg", "nav", "footer",
        "header", "aside", "form", "button", "iframe", "figure", "menu"
    }

    # Block-level tags that should introduce paragraph/section breaks
    BLOCK_TAGS = {"p", "div", "article", "section", "blockquote", "li", "td", "th"}
    HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self):
        super().__init__()
        self.discard_depth = 0
        self.current_heading_level = 0
        self.heading_buffer: List[str] = []
        
        self.paragraphs: List[str] = []
        self.current_p: List[str] = []
        
        # Metadata storage
        self.title: Optional[str] = None
        self.in_title_tag = False
        self.title_buffer: List[str] = []
        self.meta_tags: Dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        tag_lower = tag.lower()
        attrs_dict = {k.lower(): v for k, v in attrs if v is not None}

        # Handle metadata
        if tag_lower == "title":
            self.in_title_tag = True
        elif tag_lower == "meta":
            prop = attrs_dict.get("property") or attrs_dict.get("name")
            content = attrs_dict.get("content")
            if prop and content:
                self.meta_tags[prop.lower()] = content

        # Check for discardable tags
        if tag_lower in self.DISCARD_TAGS:
            self.discard_depth += 1
            return

        # Check for class/id names suggesting boilerplate/ads/comments
        class_or_id = (attrs_dict.get("class", "") + " " + attrs_dict.get("id", "")).lower()
        if any(neg in class_or_id for neg in ["cookie", "banner", "sidebar", "nav", "footer", "ad-", "ads-", "share-buttons", "comments"]):
            self.discard_depth += 1
            return

        if self.discard_depth > 0:
            return

        # Heading detection
        if tag_lower in self.HEADING_TAGS:
            self._flush_paragraph()
            self.current_heading_level = int(tag_lower[1])
            self.heading_buffer = []

        elif tag_lower in self.BLOCK_TAGS:
            self._flush_paragraph()

    def handle_endtag(self, tag: str):
        tag_lower = tag.lower()

        if tag_lower == "title":
            self.in_title_tag = False
            if self.title_buffer and not self.title:
                self.title = "".join(self.title_buffer).strip()

        if tag_lower in self.DISCARD_TAGS:
            if self.discard_depth > 0:
                self.discard_depth -= 1
            return

        if self.discard_depth > 0:
            return

        if tag_lower in self.HEADING_TAGS:
            heading_text = "".join(self.heading_buffer).strip()
            if heading_text:
                prefix = "#" * self.current_heading_level
                self.paragraphs.append(f"{prefix} {heading_text}")
            self.current_heading_level = 0
            self.heading_buffer = []

        elif tag_lower in self.BLOCK_TAGS:
            self._flush_paragraph()

    def handle_data(self, data: str):
        if self.in_title_tag:
            self.title_buffer.append(data)

        if self.discard_depth > 0:
            return

        text = data.strip()
        if not text:
            # Preserve space between words
            if data and (data.startswith(" ") or data.endswith(" ")):
                if self.current_heading_level > 0:
                    self.heading_buffer.append(" ")
                elif self.current_p:
                    self.current_p.append(" ")
            return

        if self.current_heading_level > 0:
            self.heading_buffer.append(data)
        else:
            self.current_p.append(data)

    def _flush_paragraph(self):
        if self.current_p:
            cleaned = "".join(self.current_p)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            # Filter out tiny boilerplate strings
            if len(cleaned.split()) >= 4:
                self.paragraphs.append(cleaned)
            self.current_p = []

    def get_article_text(self) -> str:
        self._flush_paragraph()
        return "\n\n".join(self.paragraphs)

    def get_metadata(self) -> Dict[str, Any]:
        # Prefer OpenGraph / Twitter meta tags, fall back to <title>
        best_title = (
            self.meta_tags.get("og:title")
            or self.meta_tags.get("twitter:title")
            or self.title
            or "Untitled Article"
        )
        # Clean title suffix (e.g. "My Story | Substack", "Article - The Atlantic")
        best_title = re.sub(r"\s*([|–—·-]\s*[^|–—·-]+)$", "", best_title).strip() or best_title

        author = (
            self.meta_tags.get("author")
            or self.meta_tags.get("article:author")
            or self.meta_tags.get("twitter:creator")
            or None
        )

        site_name = (
            self.meta_tags.get("og:site_name")
            or self.meta_tags.get("application-name")
            or None
        )

        description = (
            self.meta_tags.get("description")
            or self.meta_tags.get("og:description")
            or self.meta_tags.get("twitter:description")
            or None
        )

        return {
            "title": best_title,
            "author": author,
            "site_name": site_name,
            "description": description,
        }


class WebArticleExtractor:
    """
    Downloads and extracts clean article text and metadata from arbitrary web URLs.
    Uses Python standard library with desktop browser user-agents.
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
        parser = ArticleHTMLParser()
        parser.feed(html_content)
        
        article_text = parser.get_article_text()
        meta = parser.get_metadata()
        
        word_count = len(article_text.split()) if article_text else 0
        reading_time_min = max(1, round(word_count / 200)) if word_count else 0

        return {
            "url": url,
            "title": meta["title"],
            "author": meta["author"],
            "site_name": meta["site_name"],
            "description": meta["description"],
            "text": article_text,
            "word_count": word_count,
            "reading_time_min": reading_time_min,
        }

    @classmethod
    def extract_from_url(cls, url: str, timeout: int = 15) -> Dict[str, Any]:
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
