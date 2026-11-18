from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class LineType(str, Enum):
    NARRATION = "narration"
    DIALOGUE = "dialogue"


class SoundCuePlacement(str, Enum):
    BEFORE = "before"   # Plays right before speech starts
    DURING = "during"   # Plays concurrently (ducked under speech)
    AFTER = "after"     # Plays in pause after line ends


class SoundCue(BaseModel):
    id: str = Field(description="Unique cue ID, e.g. 'cue_001'")
    tag: str = Field(description="Descriptive cue tag, e.g. 'rain on window', 'door creaks'")
    sound_file: Optional[str] = Field(default=None, description="Filename or path in the sound library")
    placement: SoundCuePlacement = Field(default=SoundCuePlacement.DURING, description="Cue timing relative to line")
    volume_duck_db: float = Field(default=-6.0, description="Ducking volume adjustment in dB when speech is active")


class DeliveryDirection(BaseModel):
    emotion: Optional[str] = Field(default=None, description="Emotion, e.g. 'clipped, suppressing anger', 'tender'")
    pace: Optional[str] = Field(default=None, description="Pace, e.g. 'slow', 'rushed', 'measured'")
    volume: Optional[str] = Field(default=None, description="Volume, e.g. 'whisper', 'soft', 'normal', 'shout'")
    note: Optional[str] = Field(default=None, description="Summary or specific directorial note")


class Character(BaseModel):
    id: str = Field(description="Unique normalized slug, e.g. 'narrator', 'sherlock_holmes'")
    name: str = Field(description="Display name, e.g. 'Narrator', 'Sherlock Holmes'")
    aliases: List[str] = Field(default_factory=list, description="Aliases or pronouns referring to this character")
    gender_presentation: Optional[str] = Field(default=None, description="e.g. 'male', 'female', 'neutral'")
    voice_id: Optional[str] = Field(default=None, description="Assigned voice ID from TTS catalog")
    color_accent: Optional[str] = Field(default=None, description="Hex color badge for script editor")


class ScriptLine(BaseModel):
    id: str = Field(description="Unique line ID, e.g. 'line_001'")
    line_index: int = Field(description="Zero-based sequential line index")
    type: LineType = Field(description="Line classification: 'narration' or 'dialogue'")
    speaker_id: str = Field(description="Character.id of the speaker; 'narrator' for narration")
    text: str = Field(description="Strict 100% word-for-word preserved text from source")
    delivery: Optional[DeliveryDirection] = Field(default=None, description="Directorial delivery cues")
    sound_cues: List[SoundCue] = Field(default_factory=list, description="Sound cues associated with this line")
    confidence: ConfidenceLevel = Field(default=ConfidenceLevel.HIGH, description="Attribution confidence")
    
    # Render & Timing metadata
    audio_hash: Optional[str] = Field(default=None, description="MD5 hash of line parameters for caching")
    audio_duration_ms: Optional[int] = Field(default=None, description="Duration of rendered line in ms")
    start_time_ms: Optional[int] = Field(default=None, description="Playback start offset in ms")
    end_time_ms: Optional[int] = Field(default=None, description="Playback end offset in ms")


class ScriptDocument(BaseModel):
    project_id: str
    title: str
    raw_text: str
    characters: List[Character] = Field(default_factory=list)
    lines: List[ScriptLine] = Field(default_factory=list)
    total_words: int = 0
    created_at: str
    updated_at: str


# LLM Structured Output Chunk schemas
class LLMLineOutput(BaseModel):
    type: LineType = Field(description="'narration' or 'dialogue'")
    speaker_name: str = Field(description="Character name or 'Narrator'. Must use existing character names when referring to the same person.")
    text: str = Field(description="Exact word-for-word text segment from the input. DO NOT alter, paraphrase, or omit any words.")
    delivery_emotion: Optional[str] = Field(default=None, description="Directorial tone, e.g. 'whispering', 'furious'")
    delivery_pace: Optional[str] = Field(default=None, description="Pacing, e.g. 'slow', 'rapid'")
    delivery_volume: Optional[str] = Field(default=None, description="e.g. 'whisper', 'soft', 'normal', 'loud'")
    sound_cue_tag: Optional[str] = Field(default=None, description="Sound effect tag if text describes an acoustic event, e.g. 'heavy footsteps', 'rain', 'door creaks'")
    sound_cue_placement: Optional[SoundCuePlacement] = Field(default=None, description="'before', 'during', or 'after'")
    confidence: ConfidenceLevel = Field(default=ConfidenceLevel.HIGH, description="'low' if attribution is ambiguous or pronoun-unclear, 'high' if clear")


class LLMCharacterOutput(BaseModel):
    name: str = Field(description="Character display name")
    aliases: List[str] = Field(default_factory=list, description="Aliases or pronouns")
    gender_presentation: Optional[str] = Field(default=None, description="'male', 'female', 'neutral'")


class LLMSceneAnalysisResponse(BaseModel):
    characters: List[LLMCharacterOutput] = Field(description="All characters appearing or referenced as speakers in this scene, including any new characters.")
    lines: List[LLMLineOutput] = Field(description="Sequential lines covering the ENTIRE input scene word-for-word.")
