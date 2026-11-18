import os
import io
import json
import hashlib
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Callable

from app.models.script import ScriptDocument, ScriptLine, SoundCuePlacement, Character
from app.providers.base import TTSProvider, SoundCueProvider
from app.providers.sound_local import LocalSoundCueProvider
from app.providers.tts_provider import EdgeTTSProvider


def compute_line_hash(line: ScriptLine, voice_id: str) -> str:
    delivery_str = ""
    if line.delivery:
        delivery_str = f"{line.delivery.emotion or ''}:{line.delivery.pace or ''}:{line.delivery.volume or ''}"
    raw = f"{line.speaker_id}:{voice_id}:{line.text}:{delivery_str}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


class AudioMixerService:
    def __init__(
        self,
        tts_provider: Optional[TTSProvider] = None,
        sound_provider: Optional[SoundCueProvider] = None
    ):
        self.tts_provider = tts_provider or EdgeTTSProvider()
        self.sound_provider = sound_provider or LocalSoundCueProvider()

    async def render_project(
        self,
        project_dir: Path,
        script: ScriptDocument,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        inter_line_pause_ms: int = 350
    ) -> Tuple[Path, Path]:
        """
        Renders full audio for project, returning (full_audio_path, manifest_path).
        Uses per-line caching so only altered lines are re-synthesized.
        """
        import audioop
        from pydub import AudioSegment

        cache_dir = project_dir / "audio_cache"
        output_dir = project_dir / "output"
        cache_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Build character to voice mapping
        char_map: Dict[str, Character] = {c.id: c for c in script.characters}
        default_narrator_voice = "en-US-GuyNeural"
        default_char_voice = "en-US-RyanNeural"

        # Inter-line silence
        pause_segment = AudioSegment.silent(duration=inter_line_pause_ms)
        combined_audio = AudioSegment.empty()
        
        timing_manifest: List[Dict[str, Any]] = []
        current_time_ms = 0
        total_lines = len(script.lines)

        for i, line in enumerate(script.lines):
            char = char_map.get(line.speaker_id)
            if line.speaker_id == "narrator":
                voice_id = char.voice_id if char and char.voice_id else default_narrator_voice
            else:
                voice_id = char.voice_id if char and char.voice_id else default_char_voice

            line_hash = compute_line_hash(line, voice_id)
            line.audio_hash = line_hash
            cached_file = cache_dir / f"{line.id}_{line_hash}.wav"

            # 1. Synthesize or load from cache
            if cached_file.exists():
                if progress_callback:
                    progress_callback(i + 1, total_lines, f"Loaded line {i + 1} from cache")
                line_audio = AudioSegment.from_file(str(cached_file))
            else:
                if progress_callback:
                    progress_callback(i + 1, total_lines, f"Synthesizing line {i + 1}/{total_lines}")
                
                audio_bytes = await self.tts_provider.synthesize(
                    text=line.text,
                    voice_id=voice_id,
                    delivery=line.delivery
                )
                
                # Load audio bytes into AudioSegment
                try:
                    line_audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
                except Exception:
                    # Fallback silent segment
                    duration = max(800, len(line.text.split()) * 300)
                    line_audio = AudioSegment.silent(duration=duration)
                
                # Cache as WAV
                line_audio.export(str(cached_file), format="wav")

            # 2. Mix sound cues (Foley) with automatic ducking
            speech_with_cues = line_audio
            before_cues = AudioSegment.empty()
            after_cues = AudioSegment.empty()

            for cue in line.sound_cues:
                cue_path = cue.sound_file or self.sound_provider.resolve_cue_file(cue.tag)
                if cue_path and Path(cue_path).exists():
                    try:
                        cue_audio = AudioSegment.from_file(cue_path)
                        
                        if cue.placement == SoundCuePlacement.BEFORE:
                            before_cues += cue_audio
                        elif cue.placement == SoundCuePlacement.AFTER:
                            after_cues += cue_audio
                        elif cue.placement == SoundCuePlacement.DURING:
                            # Apply automatic background ducking (-6 dB default)
                            ducked_cue = cue_audio + cue.volume_duck_db
                            # Overlay ducked cue with speech
                            speech_with_cues = speech_with_cues.overlay(ducked_cue)
                    except Exception as e:
                        print(f"Warning: could not mix cue {cue.tag}: {e}")

            # Assemble full line segment
            full_line_segment = before_cues + speech_with_cues + after_cues

            # Record timestamps
            line_duration = len(full_line_segment)
            line.start_time_ms = current_time_ms
            line.end_time_ms = current_time_ms + line_duration
            line.audio_duration_ms = line_duration

            timing_manifest.append({
                "line_id": line.id,
                "line_index": line.line_index,
                "speaker_id": line.speaker_id,
                "start_time_ms": line.start_time_ms,
                "end_time_ms": line.end_time_ms,
                "duration_ms": line_duration,
                "text": line.text
            })

            combined_audio += full_line_segment + pause_segment
            current_time_ms += line_duration + inter_line_pause_ms

        # 3. Export combined master audio
        full_audio_path = output_dir / "full_cast.mp3"
        try:
            combined_audio.export(str(full_audio_path), format="mp3", bitrate="192k")
        except Exception:
            # Fallback to WAV if MP3 encoder is missing
            full_audio_path = output_dir / "full_cast.wav"
            combined_audio.export(str(full_audio_path), format="wav")

        # 4. Export timing manifest
        manifest_path = output_dir / "timing_manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump({
                "project_id": script.project_id,
                "total_duration_ms": current_time_ms,
                "lines": timing_manifest
            }, f, indent=2)

        return full_audio_path, manifest_path
