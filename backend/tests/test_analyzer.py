import asyncio
import pytest
from app.providers.analyzer_gemini import GeminiScriptAnalyzer
from app.services.ingestion import TextIngestionService
from app.services.verifier import WordDiffVerifier


def test_mock_analyzer_word_for_word():
    text = '''A slow and heavy step paused outside the door. Then there was a loud tap.

"Come in!" said Holmes.

"Pray take a seat," said Holmes.'''
    
    analyzer = GeminiScriptAnalyzer(api_key=None)
    lines, characters = asyncio.run(analyzer.analyze_scene(text, existing_characters=[]))
    
    # Verify that lines were created
    assert len(lines) > 0
    assert len(characters) >= 1
    
    # Verify strict word-for-word fidelity
    result = WordDiffVerifier.verify(text, lines)
    assert result.is_valid is True
    assert result.fidelity_percentage == 100.0


def test_chunking_service():
    paragraphs = [f"Paragraph {i} has several words to build up length for testing." for i in range(20)]
    full_text = "\n\n".join(paragraphs)
    
    chunks = TextIngestionService.chunk_text(full_text, target_chunk_words=50)
    assert len(chunks) > 1
    
    # Reconstructed text should match
    reconstructed = "\n\n".join([c.text for c in chunks])
    assert reconstructed == full_text
