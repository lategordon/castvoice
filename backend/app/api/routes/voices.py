import io
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel

from app.api.deps import get_project_store, ProjectStore
from app.providers.tts_provider import EdgeTTSProvider, CURATED_VOICES

router = APIRouter(prefix="/api/voices", tags=["voices"])
tts_provider = EdgeTTSProvider()


class PreviewVoiceRequest(BaseModel):
    voice_id: str
    text: str | None = None


@router.get("")
async def list_voices():
    return await tts_provider.get_available_voices()


@router.post("/preview")
async def preview_voice(req: PreviewVoiceRequest):
    voice_info = next((v for v in CURATED_VOICES if v["id"] == req.voice_id), None)
    if not voice_info:
        raise HTTPException(status_code=404, detail="Voice not found")

    text_to_speak = req.text or voice_info["preview_text"]
    audio_bytes = await tts_provider.synthesize(text=text_to_speak, voice_id=req.voice_id)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize preview audio")

    # Detect format (mp3 if edge-tts, wav if fallback)
    media_type = "audio/mpeg" if audio_bytes.startswith(b"\xff\xfb") or audio_bytes.startswith(b"ID3") else "audio/wav"
    return Response(content=audio_bytes, media_type=media_type)


@router.post("/preview-line/{project_id}/{line_id}")
async def preview_script_line(
    project_id: str,
    line_id: str,
    store: ProjectStore = Depends(get_project_store)
):
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")

    line = next((l for l in script.lines if l.id == line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")

    character = next((c for c in script.characters if c.id == line.speaker_id), None)
    # Default to GuyNeural if voice not explicitly assigned
    voice_id = (character.voice_id if character and character.voice_id else "en-US-GuyNeural")

    audio_bytes = await tts_provider.synthesize(
        text=line.text,
        voice_id=voice_id,
        delivery=line.delivery
    )
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize line preview")

    media_type = "audio/mpeg" if audio_bytes.startswith(b"\xff\xfb") or audio_bytes.startswith(b"ID3") else "audio/wav"
    return Response(content=audio_bytes, media_type=media_type)
