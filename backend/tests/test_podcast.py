import asyncio
import pytest
from app.services.web_extractor import WebArticleExtractor
from app.providers.analyzer_gemini import GeminiScriptAnalyzer
from app.providers.sound_local import LocalSoundCueProvider
from app.models.script import LineType, SoundCuePlacement


def test_web_article_extractor_html():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>The Architecture of Intelligence | AI Review</title>
        <meta property="og:title" content="The Architecture of Intelligence" />
        <meta name="author" content="Dr. Elena Vance" />
        <meta property="og:site_name" content="AI Review" />
    </head>
    <body>
        <nav><a href="/">Home</a><button>Menu</button></nav>
        <article>
            <h1>The Architecture of Intelligence</h1>
            <p>Artificial intelligence is fundamentally reshaping how we synthesize complex research.</p>
            <h2>The Conversational Paradigm</h2>
            <p>Rather than reading dense monographs alone, dialogue facilitates deeper conceptual retention.</p>
        </article>
        <footer>Copyright 2026</footer>
    </body>
    </html>
    """
    data = WebArticleExtractor.extract_from_html(sample_html, url="https://example.com/ai")
    assert data["title"] == "The Architecture of Intelligence"
    assert data["author"] == "Dr. Elena Vance"
    assert data["site_name"] == "AI Review"
    assert "Artificial intelligence is fundamentally reshaping" in data["text"]
    assert "# The Architecture of Intelligence" in data["text"]
    assert "## The Conversational Paradigm" in data["text"]
    assert "Home" not in data["text"]  # Nav stripped
    assert "Copyright" not in data["text"]  # Footer stripped
    assert data["word_count"] > 10


def test_web_article_extractor_strips_comments():
    sample_html_with_comments = """
    <!DOCTYPE html>
    <html>
    <head><title>History of Navigation – Maritime Blog</title></head>
    <body class="single has-sidebar">
        <div class="entry-content">
            <h1>History of Navigation</h1>
            <p>Early mariners navigated primarily by celestial observations and coastal landmarks.</p>
            <p>Modern global commerce depends deeply upon continuous naval surveillance and sea-lane protection.</p>
        </div>
        <div id="comments" class="comments-area">
            <h2>3 Comments</h2>
            <div class="comment-content"><p>Great article! But what about Polynesian wayfinding?</p></div>
            <div class="comment-content"><p>I completely disagree with the conclusion.</p></div>
        </div>
    </body>
    </html>
    """
    data = WebArticleExtractor.extract_from_html(sample_html_with_comments, url="https://example.com/nav")
    assert "Early mariners navigated primarily" in data["text"]
    assert "Modern global commerce depends" in data["text"]
    # Comments must NOT be present
    assert "Polynesian wayfinding" not in data["text"]
    assert "completely disagree with the conclusion" not in data["text"]
    assert "3 Comments" not in data["text"]


def test_podcast_conversation_mock():
    analyzer = GeminiScriptAnalyzer(force_mock=True)
    article = (
        "# The Rise of Audio\n\n"
        "Audio content is experiencing unprecedented growth.\n\n"
        "## Why People Listen\n\n"
        "Commuters and multitaskers prefer dynamic spoken discussion."
    )
    lines, characters = asyncio.run(
        analyzer.analyze_podcast_conversation(
            article_text=article,
            article_title="The Rise of Audio",
            host1_name="Alex",
            host2_name="Jordan",
            format_mode="single_episode"
        )
    )

    # Verify character ledger
    char_names = [c.name for c in characters]
    assert "Alex" in char_names
    assert "Jordan" in char_names

    # Verify lines
    assert len(lines) >= 4
    assert lines[0].speaker_id == "alex"
    assert lines[0].type == LineType.DIALOGUE
    assert any(cue.tag == "podcast intro" for cue in lines[0].sound_cues)
    assert any(cue.tag == "podcast outro" for cue in lines[-1].sound_cues)


def test_narrated_article_mock():
    analyzer = GeminiScriptAnalyzer(force_mock=True)
    article = (
        "# Introduction to Quantum\n\n"
        "Quantum computing harnesses superposition.\n\n"
        "\"This will revolutionize cryptography,\" said Dr. Alice.\n\n"
        "## Next Steps\n\n"
        "Researchers continue to scale qubit fidelity."
    )
    lines, characters = asyncio.run(
        analyzer.analyze_narrated_article(
            article_text=article,
            article_title="Introduction to Quantum",
            format_mode="single_episode"
        )
    )

    assert len(lines) >= 4
    assert lines[0].speaker_id == "narrator"
    assert any(cue.tag == "chapter stinger" for cue in lines[0].sound_cues)
    assert any(cue.tag == "podcast outro" for cue in lines[-1].sound_cues)


def test_sound_cue_resolution_podcast():
    provider = LocalSoundCueProvider("data/sound_library")
    assert provider.resolve_cue_file("podcast intro") is not None
    assert provider.resolve_cue_file("podcast outro") is not None
    assert provider.resolve_cue_file("podcast transition") is not None
    assert provider.resolve_cue_file("chapter stinger") is not None
