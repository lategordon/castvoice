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

    # 6. Podcast Intro Jingle (Arpeggiated major chord with warm decay)
    def podcast_intro_func(t, total):
        notes = [
            (0.1, 261.63),  # C4
            (0.4, 329.63),  # E4
            (0.7, 392.00),  # G4
            (1.0, 523.25),  # C5
            (1.4, 659.25),  # E5
        ]
        val = 0.0
        for note_t, freq in notes:
            dt = t - note_t
            if dt >= 0:
                env = math.exp(-dt * 2.2) * (1.0 - math.exp(-dt * 60.0))
                val += 0.25 * env * (
                    math.sin(2 * math.pi * freq * dt) +
                    0.3 * math.sin(2 * math.pi * freq * 2 * dt)
                )
        return val

    generate_wav(output_dir / "podcast_intro.wav", 3.5, podcast_intro_func)

    # 7. Podcast Transition Swoosh & Chime
    def podcast_transition_func(t, total):
        # Soft whoosh + two bright bell chimes
        env = math.sin(math.pi * (t / total))
        noise = (random.random() * 2.0 - 1.0) * 0.08 * env
        val = noise
        for chime_t, freq in [(0.2, 587.33), (0.5, 880.00)]:
            dt = t - chime_t
            if dt >= 0:
                c_env = math.exp(-dt * 4.0) * 0.35
                val += c_env * math.sin(2 * math.pi * freq * dt)
        return val

    generate_wav(output_dir / "podcast_transition.wav", 1.8, podcast_transition_func)

    # 8. Podcast Outro Theme (Resolving cadence)
    def podcast_outro_func(t, total):
        cadence = [
            (0.1, 523.25),  # C5
            (0.8, 392.00),  # G4
            (1.5, 329.63),  # E4
            (2.2, 261.63),  # C4
        ]
        val = 0.0
        for note_t, freq in cadence:
            dt = t - note_t
            if dt >= 0:
                env = math.exp(-dt * 1.5) * (1.0 - math.exp(-dt * 40.0))
                val += 0.28 * env * (
                    math.sin(2 * math.pi * freq * dt) +
                    0.25 * math.sin(2 * math.pi * freq * 2 * dt)
                )
        return val

    generate_wav(output_dir / "podcast_outro.wav", 4.0, podcast_outro_func)

    # 9. Chapter Stinger (Melodic chime marker)
    def chapter_stinger_func(t, total):
        val = 0.0
        for note_t, freq in [(0.05, 523.25), (0.25, 659.25), (0.45, 783.99)]:
            dt = t - note_t
            if dt >= 0:
                env = math.exp(-dt * 3.5) * 0.32
                val += env * math.sin(2 * math.pi * freq * dt)
        return val

    generate_wav(output_dir / "chapter_stinger.wav", 1.5, chapter_stinger_func)

    print(f"Starter sound library created in {output_dir.resolve()}")


if __name__ == "__main__":
    target = Path(__file__).resolve().parent.parent.parent.parent / "data" / "sound_library"
    create_starter_library(target)
