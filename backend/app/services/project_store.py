import os
import json
import uuid
import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.models.script import ScriptDocument, Character, ScriptLine
from app.models.project import ProjectMetadata, UpdateLineRequest


class ProjectStore:
    def __init__(self, base_dir: str | Path = "data/projects"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_project_dir(self, project_id: str) -> Path:
        return self.base_dir / project_id

    def list_projects(self) -> List[ProjectMetadata]:
        projects = []
        for p_dir in self.base_dir.iterdir():
            if p_dir.is_dir():
                meta_file = p_dir / "metadata.json"
                if meta_file.exists():
                    try:
                        with open(meta_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            projects.append(ProjectMetadata(**data))
                    except Exception as e:
                        print(f"Error loading metadata for {p_dir.name}: {e}")
        # Sort by updated_at descending
        projects.sort(key=lambda x: x.updated_at, reverse=True)
        return projects

    def create_project(self, title: str, text: str) -> ProjectMetadata:
        project_id = f"proj_{uuid.uuid4().hex[:10]}"
        p_dir = self._get_project_dir(project_id)
        p_dir.mkdir(parents=True, exist_ok=True)
        (p_dir / "audio_cache").mkdir(parents=True, exist_ok=True)
        (p_dir / "output").mkdir(parents=True, exist_ok=True)

        # Save raw source text
        source_path = p_dir / "source.txt"
        with open(source_path, "w", encoding="utf-8") as f:
            f.write(text)

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        word_count = len(text.split())

        # Create initial empty script
        script = ScriptDocument(
            project_id=project_id,
            title=title,
            raw_text=text,
            characters=[],
            lines=[],
            total_words=word_count,
            created_at=now,
            updated_at=now
        )
        self.save_script(project_id, script)

        metadata = ProjectMetadata(
            id=project_id,
            title=title,
            created_at=now,
            updated_at=now,
            word_count=word_count,
            line_count=0,
            character_count=0,
            has_audio=False,
            render_progress=0.0
        )
        self._save_metadata(project_id, metadata)
        return metadata

    def get_metadata(self, project_id: str) -> Optional[ProjectMetadata]:
        meta_file = self._get_project_dir(project_id) / "metadata.json"
        if not meta_file.exists():
            return None
        with open(meta_file, "r", encoding="utf-8") as f:
            return ProjectMetadata(**json.load(f))

    def _save_metadata(self, project_id: str, metadata: ProjectMetadata):
        meta_file = self._get_project_dir(project_id) / "metadata.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata.model_dump(), f, indent=2)

    def get_script(self, project_id: str) -> Optional[ScriptDocument]:
        script_file = self._get_project_dir(project_id) / "script.json"
        if not script_file.exists():
            return None
        with open(script_file, "r", encoding="utf-8") as f:
            return ScriptDocument(**json.load(f))

    def save_script(self, project_id: str, script: ScriptDocument) -> ScriptDocument:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        script.updated_at = now
        script_file = self._get_project_dir(project_id) / "script.json"
        with open(script_file, "w", encoding="utf-8") as f:
            json.dump(script.model_dump(), f, indent=2)

        # Update metadata summary
        meta = self.get_metadata(project_id)
        if meta:
            meta.updated_at = now
            meta.line_count = len(script.lines)
            meta.character_count = len(script.characters)
            meta.title = script.title
            self._save_metadata(project_id, meta)

        return script

    def get_raw_text(self, project_id: str) -> str:
        source_path = self._get_project_dir(project_id) / "source.txt"
        if source_path.exists():
            with open(source_path, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    def update_line(self, project_id: str, line_id: str, update: UpdateLineRequest) -> Optional[ScriptLine]:
        script = self.get_script(project_id)
        if not script:
            return None

        target_line: Optional[ScriptLine] = None
        for line in script.lines:
            if line.id == line_id:
                if update.speaker_id is not None:
                    line.speaker_id = update.speaker_id
                if update.confidence is not None:
                    line.confidence = update.confidence  # type: ignore
                if line.delivery is None and any([update.emotion, update.pace, update.volume]):
                    from app.models.script import DeliveryDirection
                    line.delivery = DeliveryDirection()
                if line.delivery:
                    if update.emotion is not None:
                        line.delivery.emotion = update.emotion
                    if update.pace is not None:
                        line.delivery.pace = update.pace
                    if update.volume is not None:
                        line.delivery.volume = update.volume
                target_line = line
                break

        if target_line:
            self.save_script(project_id, script)
        return target_line

    def merge_characters(self, project_id: str, source_id: str, target_id: str) -> Optional[ScriptDocument]:
        script = self.get_script(project_id)
        if not script:
            return None

        # Verify target character exists
        target_char = next((c for c in script.characters if c.id == target_id), None)
        source_char = next((c for c in script.characters if c.id == source_id), None)
        if not target_char or not source_char:
            return None

        # Transfer aliases
        if source_char.name not in target_char.aliases:
            target_char.aliases.append(source_char.name)
        for a in source_char.aliases:
            if a not in target_char.aliases:
                target_char.aliases.append(a)

        # Reassign all lines belonging to source_id to target_id
        for line in script.lines:
            if line.speaker_id == source_id:
                line.speaker_id = target_id

        # Remove source character from ledger
        script.characters = [c for c in script.characters if c.id != source_id]
        return self.save_script(project_id, script)

    def rename_character(self, project_id: str, character_id: str, new_name: str) -> Optional[ScriptDocument]:
        script = self.get_script(project_id)
        if not script:
            return None

        char = next((c for c in script.characters if c.id == character_id), None)
        if not char:
            return None

        if char.name not in char.aliases:
            char.aliases.append(char.name)
        char.name = new_name.strip()

        return self.save_script(project_id, script)
