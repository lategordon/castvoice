import os
import math
import wave
import random
import struct
from pathlib import Path


def generate_wav(filepath: Path, duration_s: float, sample_func, sample_rate: int = 44100):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    num_samples = int(duration_s * sample_rate)
    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        frames = bytearray()
        for i in range(num_samples):
            t = i / sample_rate
            sample_val = sample_func(t, duration_s)
            # Clamp between -1.0 and 1.0
            clamped = max(-1.0, min(1.0, sample_val))
            int_sample = int(clamped * 32767.0)
            frames.extend(struct.pack("<h", int_sample))
            
        wav_file.writeframes(frames)


def create_starter_library(output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Rain
    def rain_func(t, total):
        # Soft pink/white noise with smooth envelope
        envelope = math.sin(math.pi * (t / total))
        noise = (random.random() * 2.0 - 1.0) * 0.25
        return noise * envelope

    generate_wav(output_dir / "rain.wav", 4.0, rain_func)

    # 2. Door Creak
    def door_creak_func(t, total):
        if t > 1.2:
            return 0.0
        # Slowly varying friction squeak
        freq = 320.0 + 80.0 * math.sin(18.0 * t) + 40.0 * math.sin(40.0 * t)
        envelope = math.sin(math.pi * (t / 1.2)) * 0.35
        harmonics = (
            math.sin(2 * math.pi * freq * t) +
            0.5 * math.sin(2 * math.pi * freq * 1.5 * t) +
            (random.random() * 0.1 - 0.05)
        )
        return harmonics * envelope

    generate_wav(output_dir / "door_creak.wav", 1.5, door_creak_func)

    # 3. Footsteps
    def footsteps_func(t, total):
        # 3 footsteps at t=0.2, t=0.8, t=1.4
        val = 0.0
        for step_t in [0.2, 0.8, 1.4]:
            dt = t - step_t
            if 0 <= dt < 0.15:
                env = math.exp(-dt * 30.0)
                freq = 80.0 + 60.0 * math.exp(-dt * 40.0)
                val += 0.5 * env * math.sin(2 * math.pi * freq * dt)
        return val

    generate_wav(output_dir / "footsteps.wav", 2.0, footsteps_func)

    # 4. Thunder
    def thunder_func(t, total):
        env = math.exp(-t * 1.2) * 0.4
        rumble = (
            math.sin(2 * math.pi * 45.0 * t) * 0.6 +
            math.sin(2 * math.pi * 65.0 * t) * 0.3 +
            (random.random() * 2.0 - 1.0) * 0.2
        )
        return rumble * env

    generate_wav(output_dir / "thunder.wav", 3.0, thunder_func)

    # 5. Knock
    def knock_func(t, total):
        val = 0.0
        for knock_t in [0.15, 0.45]:
            dt = t - knock_t
            if 0 <= dt < 0.12:
                env = math.exp(-dt * 35.0)
                freq = 140.0
                val += 0.6 * env * math.sin(2 * math.pi * freq * dt)
        return val

    generate_wav(output_dir / "knock.wav", 1.0, knock_func)

    print(f"Starter sound library created in {output_dir.resolve()}")


if __name__ == "__main__":
    target = Path(__file__).resolve().parent.parent.parent.parent / "data" / "sound_library"
    create_starter_library(target)
