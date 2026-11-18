import re
import difflib
from typing import List, Tuple
from pydantic import BaseModel, Field

from app.models.script import ScriptLine


class VerificationMismatch(BaseModel):
    kind: str = Field(description="'missing_in_script' or 'extra_in_script' or 'replaced'")
    source_words: List[str]
    script_words: List[str]
    approx_line_index: int = 0


class VerificationResult(BaseModel):
    is_valid: bool
    fidelity_percentage: float
    source_word_count: int
    script_word_count: int
    mismatches: List[VerificationMismatch] = Field(default_factory=list)
    details: str = ""


class WordDiffVerifier:
    """
    Verifies that the generated script lines preserve the input prose 100% word-for-word,
    without rewriting, omissions, or hallucinations.
    """

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """
        Tokenizes text into lowercase words/contractions, stripping formatting and punctuation.
        Preserves contractions (e.g. don't, it's, Watson's).
        """
        # Normalize curly quotes and special dashes
        normalized = (
            text.replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
            .replace("—", " ")
            .replace("–", " ")
        )
        # Find words including internal apostrophes
        tokens = re.findall(r"\b[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?\b", normalized.lower())
        return tokens

    @classmethod
    def verify(cls, source_text: str, lines: List[ScriptLine]) -> VerificationResult:
        source_tokens = cls.tokenize(source_text)
        
        # Tokenize lines individually to track token-to-line mapping
        script_tokens: List[str] = []
        token_to_line_idx: List[int] = []

        for line in lines:
            line_tokens = cls.tokenize(line.text)
            for token in line_tokens:
                script_tokens.append(token)
                token_to_line_idx.append(line.line_index)

        source_count = len(source_tokens)
        script_count = len(script_tokens)

        if source_count == 0 and script_count == 0:
            return VerificationResult(
                is_valid=True,
                fidelity_percentage=100.0,
                source_word_count=0,
                script_word_count=0,
                details="Empty source text and empty script."
            )

        # Quick exact match check
        if source_tokens == script_tokens:
            return VerificationResult(
                is_valid=True,
                fidelity_percentage=100.0,
                source_word_count=source_count,
                script_word_count=script_count,
                details="Perfect 100% word-for-word match."
            )

        # Detailed diff analysis
        matcher = difflib.SequenceMatcher(None, source_tokens, script_tokens)
        mismatches: List[VerificationMismatch] = []
        matching_blocks = matcher.get_matching_blocks()
        total_matched = sum(block.size for block in matching_blocks)

        fidelity = (2.0 * total_matched / (source_count + script_count)) * 100.0

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                continue
            approx_line = token_to_line_idx[j1] if j1 < len(token_to_line_idx) else (len(lines) - 1 if lines else 0)
            
            mismatches.append(
                VerificationMismatch(
                    kind=tag,
                    source_words=source_tokens[i1:i2],
                    script_words=script_tokens[j1:j2],
                    approx_line_index=approx_line
                )
            )

        is_valid = (source_tokens == script_tokens)
        details = f"Fidelity: {fidelity:.2f}%. Mismatches detected: {len(mismatches)}."

        return VerificationResult(
            is_valid=is_valid,
            fidelity_percentage=round(fidelity, 2),
            source_word_count=source_count,
            script_word_count=script_count,
            mismatches=mismatches,
            details=details
        )
