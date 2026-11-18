import os
import io
import asyncio
from typing import List, Dict, Any, Optional

from app.providers.base import TTSProvider
from app.models.script import DeliveryDirection

# Curated catalog of high-quality expressive voices
CURATED_VOICES = [
    {
        "id": "en-US-GuyNeural",
        "name": "Guy (Warm, Confident Narrator)",
        "gender": "male",
        "accent": "US",
        "preview_text": "To Sherlock Holmes she is always THE woman."
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny (Clear, Engaging)",
        "gender": "female",
        "accent": "US",
        "preview_text": "I understand that this gentleman is a man of honor and discretion."
    },
    {
        "id": "en-GB-RyanNeural",
        "name": "Ryan (Classic British Dramatic)",
        "gender": "male",
        "accent": "UK",
        "preview_text": "Pray take a seat. This is my friend and colleague, Dr. Watson."
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia (Poised, Expressive)",
        "gender": "female",
        "accent": "UK",
        "preview_text": "Then, as you will. I must begin by binding you both to absolute secrecy."
    },
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher (Deep, Authoritative)",
        "gender": "male",
        "accent": "US",
        "preview_text": "It was on the twentieth of March that I was returning from a journey."
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria (Versatile, Dynamic)",
        "gender": "female",
        "accent": "US",
        "preview_text": "At present it is not too much to say that it may influence European history."
    },
    {
        "id": "en-US-EricNeural",
        "name": "Eric (Thoughtful, Analytical)",
        "gender": "male",
        "accent": "US",
        "preview_text": "You may say before this gentleman anything which may be said to me."
    }
]


class EdgeTTSProvider(TTSProvider):
    """
    Free, high-quality neural TTS provider via edge-tts.
    Supports expressive speech with rate, pitch, and volume adjustments.
    """

    async def get_available_voices(self) -> List[Dict[str, Any]]:
        return CURATED_VOICES

    async def synthesize(
        self,
        text: str,
        voice_id: str,
        delivery: Optional[DeliveryDirection] = None
    ) -> bytes:
        clean_text = text.strip()
        if not clean_text:
            return b""

        # Format delivery adjustments
        rate_mod = "+0%"
        volume_mod = "+0%"
        pitch_mod = "+0Hz"

        if delivery:
            if delivery.pace == "slow":
                rate_mod = "-15%"
            elif delivery.pace == "rushed" or delivery.pace == "rapid":
                rate_mod = "+15%"

            if delivery.volume == "whisper" or delivery.volume == "soft":
                volume_mod = "-25%"
            elif delivery.volume == "shout" or delivery.volume == "loud":
                volume_mod = "+25%"

        try:
            import edge_tts
            communicate = edge_tts.Communicate(
                text=clean_text,
                voice=voice_id,
                rate=rate_mod,
                volume=volume_mod,
                pitch=pitch_mod
            )
            audio_buffer = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.extend(chunk["data"])
            return bytes(audio_buffer)
        except Exception as e:
            print(f"[EdgeTTSProvider] Synthesis failed ({e}); generating silent fallback segment.")
            return self._generate_silence_wav(duration_ms=1000)

    @staticmethod
    def _generate_silence_wav(duration_ms: int = 1000) -> bytes:
        """Generates standard RIFF 44.1kHz 16-bit mono silence WAV header and data."""
        import struct
        sample_rate = 44100
        num_samples = int(sample_rate * (duration_ms / 1000.0))
        data_size = num_samples * 2  # 16-bit = 2 bytes per sample
        
        # WAV header
        header = bytearray()
        header.extend(b'RIFF')
        header.extend(struct.pack('<I', 36 + data_size))
        header.extend(b'WAVEfmt ')
        header.extend(struct.pack('<I', 16))          # Subchunk1Size
        header.extend(struct.pack('<H', 1))           # AudioFormat (PCM)
        header.extend(struct.pack('<H', 1))           # NumChannels (Mono)
        header.extend(struct.pack('<I', sample_rate)) # SampleRate
        header.extend(struct.pack('<I', sample_rate * 2)) # ByteRate
        header.extend(struct.pack('<H', 2))           # BlockAlign
        header.extend(struct.pack('<H', 16))          # BitsPerSample
        header.extend(b'data')
        header.extend(struct.pack('<I', data_size))
        
        # Zero bytes for silence
        return bytes(header) + bytes(data_size)
