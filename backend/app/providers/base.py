from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple

from app.models.script import Character, ScriptLine, DeliveryDirection


class ScriptAnalyzer(ABC):
    """
    Abstract interface for prose-to-script LLM conversion.
    """

    @abstractmethod
    async def analyze_scene(
        self,
        scene_text: str,
        existing_characters: List[Character],
        start_line_index: int = 0
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Converts raw prose into a list of structured ScriptLine instances and updates
        the Character ledger while preserving existing character IDs and aliases.
        """
        pass


class TTSProvider(ABC):
    """
    Abstract interface for text-to-speech synthesis.
    """

    @abstractmethod
    async def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Returns catalog of available voices: id, name, gender, language, preview_url.
        """
        pass

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_id: str,
        delivery: Optional[DeliveryDirection] = None
    ) -> bytes:
        """
        Synthesizes line to audio bytes (MP3 or WAV).
        """
        pass


class SoundCueProvider(ABC):
    """
    Abstract interface for sound cues and Foley library lookups.
    """

    @abstractmethod
    def list_available_cues(self) -> List[Dict[str, Any]]:
        """
        Lists all available sound effects in the local library.
        """
        pass

    @abstractmethod
    def resolve_cue_file(self, cue_tag: str) -> Optional[str]:
        """
        Matches a natural language sound cue tag (e.g. 'rain on window') to an audio file.
        """
        pass
