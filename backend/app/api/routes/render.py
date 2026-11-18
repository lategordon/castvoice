import json
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.deps import get_project_store, ProjectStore
from app.services.audio_mixer import AudioMixerService

router = APIRouter(prefix="/api/projects/{project_id}", tags=["render"])
mixer_service = AudioMixerService()

# In-memory progress tracker: {project_id: {"current": 0, "total": 0, "status": "idle"}}
RENDER_PROGRESS: Dict[str, Dict[str, Any]] = {}


class RenderRequest(BaseModel):
    inter_line_pause_ms: int = 350


class RenderResponse(BaseModel):
    project_id: str
    audio_url: str
    manifest_url: str
    total_duration_ms: int
    lines_rendered: int


@router.get("/render-progress")
def get_render_progress(project_id: str):
    return RENDER_PROGRESS.get(project_id, {"current": 0, "total": 0, "status": "idle"})


@router.post("/render", response_model=RenderResponse)
async def render_project_audio(
    project_id: str,
    req: RenderRequest = RenderRequest(),
    store: ProjectStore = Depends(get_project_store)
):
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")

    if not script.lines:
        raise HTTPException(status_code=400, detail="Script has no lines to render.")

    project_dir = store._get_project_dir(project_id)
    RENDER_PROGRESS[project_id] = {
        "current": 0,
        "total": len(script.lines),
        "status": "Starting render..."
    }

    def on_progress(current: int, total: int, msg: str):
        RENDER_PROGRESS[project_id] = {
            "current": current,
            "total": total,
            "status": msg
        }

    try:
        audio_file, manifest_file = await mixer_service.render_project(
            project_dir=project_dir,
            script=script,
            progress_callback=on_progress,
            inter_line_pause_ms=req.inter_line_pause_ms
        )

        # Update script document with line timestamps and save
        store.save_script(project_id, script)

        # Update metadata
        meta = store.get_metadata(project_id)
        if meta:
            meta.has_audio = True
            meta.render_progress = 1.0
            store._save_metadata(project_id, meta)

        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)

        RENDER_PROGRESS[project_id] = {
            "current": len(script.lines),
            "total": len(script.lines),
            "status": "Completed"
        }

        return RenderResponse(
            project_id=project_id,
            audio_url=f"/api/projects/{project_id}/audio",
            manifest_url=f"/api/projects/{project_id}/manifest",
            total_duration_ms=manifest_data.get("total_duration_ms", 0),
            lines_rendered=len(script.lines)
        )
    except Exception as e:
        RENDER_PROGRESS[project_id] = {
            "current": 0,
            "total": len(script.lines),
            "status": f"Error: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")


@router.get("/audio")
def get_project_audio(project_id: str, store: ProjectStore = Depends(get_project_store)):
    project_dir = store._get_project_dir(project_id)
    mp3_path = project_dir / "output" / "full_cast.mp3"
    wav_path = project_dir / "output" / "full_cast.wav"

    if mp3_path.exists():
        return FileResponse(
            path=str(mp3_path),
            media_type="audio/mpeg",
            filename=f"{project_id}_full_cast.mp3"
        )
    elif wav_path.exists():
        return FileResponse(
            path=str(wav_path),
            media_type="audio/wav",
            filename=f"{project_id}_full_cast.wav"
        )
    else:
        raise HTTPException(status_code=404, detail="Audio has not been rendered yet.")


@router.get("/manifest")
def get_project_manifest(project_id: str, store: ProjectStore = Depends(get_project_store)):
    manifest_path = store._get_project_dir(project_id) / "output" / "timing_manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Timing manifest not found.")
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)
