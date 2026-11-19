import io
import re
from typing import Dict, Any, Optional
from pathlib import Path


class DocumentExtractor:
    """
    Extracts text, metadata (title, author, word count, reading time),
    and structure from uploaded files (.pdf, .docx, .txt, .md).
    """

    @staticmethod
    def extract_from_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            return DocumentExtractor._extract_pdf(file_bytes, filename)
        elif ext == ".docx":
            return DocumentExtractor._extract_docx(file_bytes, filename)
        elif ext in [".txt", ".md", ".markdown"]:
            return DocumentExtractor._extract_text(file_bytes, filename)
        else:
            # Try text decode fallback
            try:
                return DocumentExtractor._extract_text(file_bytes, filename)
            except Exception:
                raise ValueError(
                    f"Unsupported file format '{ext}'. Please upload a .pdf, .docx, .txt, or .md file."
                )

    @staticmethod
    def _extract_pdf(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        try:
            import pypdf
        except ImportError:
            raise RuntimeError("pypdf is not installed. Please install pypdf to extract PDF files.")

        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Could not parse PDF file: {str(e)}")

        num_pages = len(reader.pages)
        if num_pages == 0:
            raise ValueError("The uploaded PDF has 0 pages.")

        page_texts = []
        for idx, page in enumerate(reader.pages):
            try:
                t = page.extract_text() or ""
                # Remove stray null bytes and clean spacing
                t = t.replace("\x00", "").strip()
                if t:
                    page_texts.append(t)
            except Exception:
                continue

        full_text = "\n\n".join(page_texts).strip()

        if not full_text:
            raise ValueError(
                "No selectable text could be extracted from this PDF. "
                "It may be a scanned image without an OCR text layer. "
                "Please upload a PDF containing selectable text or paste the content directly."
            )

        # Extract metadata if available
        meta = reader.metadata or {}
        pdf_title = getattr(meta, "title", None) or (meta.get("/Title") if isinstance(meta, dict) else None)
        pdf_author = getattr(meta, "author", None) or (meta.get("/Author") if isinstance(meta, dict) else None)

        title = str(pdf_title).strip() if pdf_title else ""
        # If title is empty or looks like a placeholder, use filename
        if not title or len(title) < 2 or title.lower().startswith("untitled"):
            clean_name = Path(filename).stem
            title = clean_name.replace("_", " ").replace("-", " ").title()

        author = str(pdf_author).strip() if pdf_author else None
        words = len(full_text.split())

        return {
            "title": title,
            "author": author,
            "text": full_text,
            "filename": filename,
            "file_type": "pdf",
            "num_pages": num_pages,
            "word_count": words,
            "reading_time_min": max(1, round(words / 200)),
        }

    @staticmethod
    def _extract_docx(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        try:
            import docx
        except ImportError:
            raise RuntimeError("python-docx is not installed. Please install python-docx to extract .docx files.")

        try:
            doc = docx.Document(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Could not parse Word document: {str(e)}")

        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs).strip()

        if not full_text:
            raise ValueError("The uploaded Word document contains no readable text.")

        title = ""
        author = None
        try:
            props = doc.core_properties
            if props.title and props.title.strip():
                title = props.title.strip()
            if props.author and props.author.strip():
                author = props.author.strip()
        except Exception:
            pass

        if not title:
            # Check first paragraph if it's a heading
            if paragraphs and len(paragraphs[0]) < 120 and "\n" not in paragraphs[0]:
                title = paragraphs[0]
            else:
                title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        words = len(full_text.split())

        return {
            "title": title,
            "author": author,
            "text": full_text,
            "filename": filename,
            "file_type": "docx",
            "num_pages": max(1, round(words / 400)),
            "word_count": words,
            "reading_time_min": max(1, round(words / 200)),
        }

    @staticmethod
    def _extract_text(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception:
                text = file_bytes.decode("utf-8", errors="replace")

        full_text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not full_text:
            raise ValueError("The uploaded file is empty.")

        # Try to find markdown title (# Title)
        title = ""
        lines = full_text.splitlines()
        for line in lines[:10]:
            clean_l = line.strip()
            if clean_l.startswith("# "):
                title = clean_l[2:].strip()
                break

        if not title:
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        words = len(full_text.split())
        ext = Path(filename).suffix.lower()

        return {
            "title": title,
            "author": None,
            "text": full_text,
            "filename": filename,
            "file_type": ext.lstrip(".") or "txt",
            "num_pages": max(1, round(words / 400)),
            "word_count": words,
            "reading_time_min": max(1, round(words / 200)),
        }
