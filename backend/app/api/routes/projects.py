import shutil
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel

from app.api.deps import get_project_store, ProjectStore
from app.models.project import (
    ProjectMetadata,
    CreateProjectRequest,
    UpdateLineRequest,
    MergeCharactersRequest,
    RenameCharacterRequest
)
from app.models.script import ScriptDocument, ScriptLine
from app.services.ingestion import TextIngestionService
from app.services.document_extractor import DocumentExtractor

router = APIRouter(prefix="/api/projects", tags=["projects"])


class AssignVoiceRequest(BaseModel):
    voice_id: str


class IngestUrlRequest(BaseModel):
    url: str


@router.post("/ingest-url")
def ingest_web_url(req: IngestUrlRequest):
    try:
        from app.services.web_extractor import WebArticleExtractor
        data = WebArticleExtractor.extract_from_url(req.url)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[ProjectMetadata])
def list_projects(store: ProjectStore = Depends(get_project_store)):
    return store.list_projects()


@router.post("", response_model=ProjectMetadata)
def create_project(req: CreateProjectRequest, store: ProjectStore = Depends(get_project_store)):
    text = req.text or ""
    return store.create_project(title=req.title, text=text)


@router.post("/parse-document")
async def parse_document(
    file: UploadFile = File(...)
):
    """
    Parses an uploaded file (.pdf, .docx, .txt, .md) and returns its
    extracted text, detected title, author, page count, and word count.
    Used by the frontend to populate the prose content textarea and metadata.
    """
    filename = file.filename or "document"
    contents = await file.read()
    try:
        extracted = DocumentExtractor.extract_from_bytes(contents, filename)
        return extracted
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload", response_model=ProjectMetadata)
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    store: ProjectStore = Depends(get_project_store)
):
    filename = file.filename or "uploaded_story"
    contents = await file.read()
    try:
        extracted = DocumentExtractor.extract_from_bytes(contents, filename)
        text = extracted["text"]
        proj_title = title or extracted.get("title") or filename.rsplit(".", 1)[0].replace("_", " ").title()
    except Exception as e:
        # Fallback to plain text decode if document extractor threw an error
        try:
            text = contents.decode("utf-8")
        except UnicodeDecodeError:
            text = contents.decode("latin-1", errors="replace")
        proj_title = title or filename.rsplit(".", 1)[0].replace("_", " ").title()

    return store.create_project(title=proj_title, text=text)


@router.get("/{project_id}", response_model=ScriptDocument)
def get_project_script(project_id: str, store: ProjectStore = Depends(get_project_store)):
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")
    return script


@router.get("/{project_id}/metadata", response_model=ProjectMetadata)
def get_project_metadata(project_id: str, store: ProjectStore = Depends(get_project_store)):
    meta = store.get_metadata(project_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Project not found")
    return meta


@router.put("/{project_id}/script", response_model=ScriptDocument)
def update_script(project_id: str, script: ScriptDocument, store: ProjectStore = Depends(get_project_store)):
    if not store.get_metadata(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return store.save_script(project_id, script)


@router.patch("/{project_id}/lines/{line_id}", response_model=ScriptLine)
def update_line(
    project_id: str,
    line_id: str,
    req: UpdateLineRequest,
    store: ProjectStore = Depends(get_project_store)
):
    line = store.update_line(project_id, line_id, req)
    if not line:
        raise HTTPException(status_code=404, detail="Line or project not found")
    return line


@router.post("/{project_id}/characters/merge", response_model=ScriptDocument)
def merge_characters(
    project_id: str,
    req: MergeCharactersRequest,
    store: ProjectStore = Depends(get_project_store)
):
    script = store.merge_characters(project_id, req.source_character_id, req.target_character_id)
    if not script:
        raise HTTPException(status_code=400, detail="Could not merge characters; invalid IDs")
    return script


@router.post("/{project_id}/characters/rename", response_model=ScriptDocument)
def rename_character(
    project_id: str,
    req: RenameCharacterRequest,
    store: ProjectStore = Depends(get_project_store)
):
    script = store.rename_character(project_id, req.character_id, req.new_name)
    if not script:
        raise HTTPException(status_code=404, detail="Character or project not found")
    return script


@router.post("/{project_id}/characters/{character_id}/voice", response_model=ScriptDocument)
def assign_voice(
    project_id: str,
    character_id: str,
    req: AssignVoiceRequest,
    store: ProjectStore = Depends(get_project_store)
):
    script = store.get_script(project_id)
    if not script:
        raise HTTPException(status_code=404, detail="Project not found")

    char = next((c for c in script.characters if c.id == character_id), None)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    char.voice_id = req.voice_id
    return store.save_script(project_id, script)
