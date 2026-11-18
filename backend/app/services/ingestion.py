import os
import re
from typing import List
from pathlib import Path


class TextChunk:
    def __init__(self, index: int, text: str, word_count: int):
        self.index = index
        self.text = text
        self.word_count = word_count


class TextIngestionService:
    """
    Ingests and parses source text (.txt, .md, raw strings),
    and segments long texts into scene/paragraph chunks for processing.
    """

    @staticmethod
    def read_file(file_path: str | Path) -> str:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = path.suffix.lower()
        if ext in [".txt", ".md"]:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        elif ext == ".docx":
            try:
                import docx  # type: ignore
                doc = docx.Document(path)
                return "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            except ImportError:
                # Basic fallback if python-docx isn't installed
                raise ImportError("python-docx is required to read .docx files. Install it or use .txt/.md.")
        else:
            # Attempt to read as plain text
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()

    @staticmethod
    def chunk_text(text: str, target_chunk_words: int = 1000) -> List[TextChunk]:
        """
        Splits text into chunks respecting paragraph boundaries (`\n\n`).
        Never splits inside a paragraph. Target chunk size is ~800-1200 words.
        """
        # Normalize newlines
        cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not cleaned:
            return []

        # Split on double newlines (paragraphs)
        paragraphs = re.split(r"\n\s*\n", cleaned)
        chunks: List[TextChunk] = []
        current_paragraphs: List[str] = []
        current_word_count = 0
        chunk_idx = 0

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            words_in_p = len(p.split())
            
            # If adding this paragraph exceeds target and we already have content, close chunk
            if current_word_count + words_in_p > target_chunk_words and current_paragraphs:
                chunk_text = "\n\n".join(current_paragraphs)
                chunks.append(TextChunk(index=chunk_idx, text=chunk_text, word_count=current_word_count))
                chunk_idx += 1
                current_paragraphs = [p]
                current_word_count = words_in_p
            else:
                current_paragraphs.append(p)
                current_word_count += words_in_p

        if current_paragraphs:
            chunk_text = "\n\n".join(current_paragraphs)
            chunks.append(TextChunk(index=chunk_idx, text=chunk_text, word_count=current_word_count))

        return chunks
