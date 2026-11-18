from typing import Optional, List
from pydantic import BaseModel, Field


class ProjectMetadata(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    word_count: int = 0
    line_count: int = 0
    character_count: int = 0
    has_audio: bool = False
    render_progress: float = 0.0  # 0.0 to 1.0


class CreateProjectRequest(BaseModel):
    title: str = "Untitled Story"
    text: Optional[str] = None


class UpdateLineRequest(BaseModel):
    speaker_id: Optional[str] = None
    emotion: Optional[str] = None
    pace: Optional[str] = None
    volume: Optional[str] = None
    confidence: Optional[str] = None


class MergeCharactersRequest(BaseModel):
    source_character_id: str
    target_character_id: str


class RenameCharacterRequest(BaseModel):
    character_id: str
    new_name: str
