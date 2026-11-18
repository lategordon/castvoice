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

    # Chunk text
    chunks = TextIngestionService.chunk_text(raw_text, target_chunk_words=req.chunk_size)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not create any chunks from text.")

    # Determine analyzer
    api_key = settings.gemini_api_key if not req.force_mock else None
    analyzer = GeminiScriptAnalyzer(api_key=api_key, model_name=settings.gemini_model)

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

    # Load and update script
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")

    script.characters = characters
    script.lines = all_lines
    script.total_words = len(raw_text.split())
    
    saved_script = store.save_script(project_id, script)

    return AnalyzeResponse(
        project_id=project_id,
        script=saved_script,
        verification=verification,
        message=f"Analyzed {len(chunks)} chunk(s). Generated {len(all_lines)} lines with {verification.fidelity_percentage}% fidelity."
    )
