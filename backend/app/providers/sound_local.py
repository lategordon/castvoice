import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.providers.base import SoundCueProvider


class LocalSoundCueProvider(SoundCueProvider):
    """
    Indexes and matches audio cues against files in the local data/sound_library directory.
    """

    def __init__(self, library_dir: str | Path = "data/sound_library"):
        self.library_dir = Path(library_dir)
        self.library_dir.mkdir(parents=True, exist_ok=True)

    def list_available_cues(self) -> List[Dict[str, Any]]:
        cues = []
        if not self.library_dir.exists():
            return cues

        for f in self.library_dir.iterdir():
            if f.suffix.lower() in [".wav", ".mp3", ".ogg", ".flac", ".m4a"]:
                name = f.stem.replace("_", " ").title()
                cues.append({
                    "id": f.stem,
                    "filename": f.name,
                    "name": name,
                    "path": str(f.resolve())
                })
        return cues

    def resolve_cue_file(self, cue_tag: str) -> Optional[str]:
        """
        Performs fuzzy keyword matching to map a cue tag (e.g. 'rain on window')
        to an audio file in the library (e.g. 'rain.wav').
        """
        if not self.library_dir.exists():
            return None

        clean_tag = cue_tag.lower().strip().replace("_", " ")
        tag_tokens = set(re.findall(r"[a-zA-Z0-9]+", clean_tag))

        best_match = None
        best_score = 0

        for f in self.library_dir.iterdir():
            if f.suffix.lower() in [".wav", ".mp3", ".ogg", ".flac", ".m4a"]:
                clean_filename = f.stem.lower().replace("_", " ")
                file_tokens = set(re.findall(r"[a-zA-Z0-9]+", clean_filename))
                common = tag_tokens.intersection(file_tokens)
                if len(common) > best_score:
                    best_score = len(common)
                    best_match = str(f.resolve())

        return best_match
