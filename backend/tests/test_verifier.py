import pytest
from app.models.script import ScriptLine, LineType, ConfidenceLevel
from app.services.verifier import WordDiffVerifier


def test_verifier_perfect_match():
    source_text = 'Sherlock Holmes looked up. "Come in!" said he.'
    lines = [
        ScriptLine(
            id="l1",
            line_index=0,
            type=LineType.NARRATION,
            speaker_id="narrator",
            text="Sherlock Holmes looked up."
        ),
        ScriptLine(
            id="l2",
            line_index=1,
            type=LineType.DIALOGUE,
            speaker_id="sherlock_holmes",
            text='"Come in!"'
        ),
        ScriptLine(
            id="l3",
            line_index=2,
            type=LineType.NARRATION,
            speaker_id="narrator",
            text="said he."
        )
    ]
    result = WordDiffVerifier.verify(source_text, lines)
    assert result.is_valid is True
    assert result.fidelity_percentage == 100.0
    assert len(result.mismatches) == 0


def test_verifier_detects_omission():
    source_text = "The dark silhouette moved twice in the night."
    # "moved" is missing in the script
    lines = [
        ScriptLine(
            id="l1",
            line_index=0,
            type=LineType.NARRATION,
            speaker_id="narrator",
            text="The dark silhouette twice in the night."
        )
    ]
    result = WordDiffVerifier.verify(source_text, lines)
    assert result.is_valid is False
    assert result.fidelity_percentage < 100.0
    assert len(result.mismatches) > 0
    assert "moved" in result.mismatches[0].source_words


def test_verifier_detects_hallucination():
    source_text = "He opened the door."
    # "wooden" was hallucinated
    lines = [
        ScriptLine(
            id="l1",
            line_index=0,
            type=LineType.NARRATION,
            speaker_id="narrator",
            text="He opened the wooden door."
        )
    ]
    result = WordDiffVerifier.verify(source_text, lines)
    assert result.is_valid is False
    assert result.fidelity_percentage < 100.0
    assert len(result.mismatches) > 0


def test_verifier_handles_curly_quotes_and_dashes():
    source_text = "“Wait,”—whispered Mary—‘don’t move!’"
    lines = [
        ScriptLine(
            id="l1",
            line_index=0,
            type=LineType.DIALOGUE,
            speaker_id="mary",
            text='"Wait,"'
        ),
        ScriptLine(
            id="l2",
            line_index=1,
            type=LineType.NARRATION,
            speaker_id="narrator",
            text="whispered Mary"
        ),
        ScriptLine(
            id="l3",
            line_index=2,
            type=LineType.DIALOGUE,
            speaker_id="mary",
            text="'don't move!'"
        )
    ]
    result = WordDiffVerifier.verify(source_text, lines)
    assert result.is_valid is True
    assert result.fidelity_percentage == 100.0
