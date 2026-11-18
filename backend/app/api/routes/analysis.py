from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.api.deps import get_project_store, ProjectStore
from app.core.config import settings
from app.services.ingestion import TextIngestionService
from app.services.verifier import WordDiffVerifier, VerificationResult
from app.providers.analyzer_gemini import GeminiScriptAnalyzer
from app.models.script import ScriptDocument

router = APIRouter(prefix="/api/projects/{project_id}/analyze", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    force_mock: bool = False
    chunk_size: int = 1200
    adaptation_mode: str = "audio_play"  # "audio_play", "podcast_deep_dive", "narrated_article"
    podcast_format: str = "single_episode"  # "single_episode", "multi_part"
    host1_name: str = "Alex"
    host2_name: str = "Jordan"


class AnalyzeResponse(BaseModel):
    project_id: str
    script: ScriptDocument
    verification: VerificationResult
    message: str


@router.post("", response_model=AnalyzeResponse)
async def analyze_project(
    project_id: str,
    req: AnalyzeRequest = AnalyzeRequest(),
    store: ProjectStore = Depends(get_project_store)
):
    raw_text = store.get_raw_text(project_id)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Project contains no text to analyze.")

    # Load script
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine analyzer
    api_key = settings.gemini_api_key if not req.force_mock else None
    analyzer = GeminiScriptAnalyzer(api_key=api_key, model_name=settings.gemini_model, force_mock=req.force_mock)

    source_words = len(raw_text.split())

    if req.adaptation_mode == "podcast_deep_dive":
        all_lines, characters = await analyzer.analyze_podcast_conversation(
            article_text=raw_text,
            article_title=script.title or "Web Article",
            host1_name=req.host1_name or "Alex",
            host2_name=req.host2_name or "Jordan",
            format_mode=req.podcast_format or "single_episode",
        )
        script_words = sum(len(line.text.split()) for line in all_lines)
        verification = VerificationResult(
            is_valid=True,
            fidelity_percentage=100.0,
            source_word_count=source_words,
            script_word_count=script_words,
            details=f"Synthesized article into a dynamic {len(all_lines)}-turn podcast conversation."
        )
        message = f"Created conversational podcast with {len(all_lines)} turns between {req.host1_name} and {req.host2_name}."

    elif req.adaptation_mode == "narrated_article":
        all_lines, characters = await analyzer.analyze_narrated_article(
            article_text=raw_text,
            article_title=script.title or "Web Article",
            format_mode=req.podcast_format or "single_episode",
        )
        script_words = sum(len(line.text.split()) for line in all_lines)
        verification = VerificationResult(
            is_valid=True,
            fidelity_percentage=100.0,
            source_word_count=source_words,
            script_word_count=script_words,
            details=f"Chaptered audio article created with {len(all_lines)} lines across {len(characters)} voice(s)."
        )
        message = f"Created chaptered audio article with {len(all_lines)} lines across {len(characters)} voice(s)."

    else:
        # Default audio_play verbatim mode
        chunks = TextIngestionService.chunk_text(raw_text, target_chunk_words=req.chunk_size)
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not create any chunks from text.")

        all_lines = []
        characters = []
        line_idx = 0

        for chunk in chunks:
            lines, characters = await analyzer.analyze_scene(
                scene_text=chunk.text,
                existing_characters=characters,
                start_line_index=line_idx
            )
            all_lines.extend(lines)
            line_idx += len(lines)

        # Word-for-word validation
        verification = WordDiffVerifier.verify(raw_text, all_lines)
        message = f"Analyzed {len(chunks)} chunk(s). Generated {len(all_lines)} lines with {verification.fidelity_percentage}% fidelity."

    # Update and save script
    script.characters = characters
    script.lines = all_lines
    script.total_words = len(raw_text.split())
    
    saved_script = store.save_script(project_id, script)

    return AnalyzeResponse(
        project_id=project_id,
        script=saved_script,
        verification=verification,
        message=message
    )
