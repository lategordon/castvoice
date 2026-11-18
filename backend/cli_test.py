#!/usr/bin/env python3
import sys
import os
import argparse
import asyncio
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir.parent / ".env")

from app.services.ingestion import TextIngestionService
from app.services.verifier import WordDiffVerifier
from app.providers.analyzer_gemini import GeminiScriptAnalyzer
from app.models.script import ScriptDocument


async def run_pipeline(
    input_path: str,
    output_path: str | None = None,
    force_mock: bool = False
):
    print("=" * 70)
    print(" CastVoice — CLI Script Analysis & Verification Pipeline")
    print("=" * 70)

    # 1. Read input prose
    print(f"\n[1/4] Ingesting text from: {input_path}")
    raw_text = TextIngestionService.read_file(input_path)
    total_words = len(raw_text.split())
    print(f"      Total characters: {len(raw_text):,} | Total words: {total_words:,}")

    # 2. Chunk text
    print("\n[2/4] Segmenting text into scene chunks...")
    chunks = TextIngestionService.chunk_text(raw_text, target_chunk_words=1200)
    print(f"      Created {len(chunks)} chunk(s) preserving paragraph boundaries.")

    # 3. Analyze script
    api_key = os.getenv("GEMINI_API_KEY")
    use_live_gemini = bool(api_key and api_key != "your_gemini_api_key_here" and not force_mock)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    mode_str = f"Gemini API ({model_name})" if use_live_gemini else "Local Deterministic Parser (Offline Mock)"
    print(f"\n[3/4] Analyzing script using: {mode_str}")

    analyzer = GeminiScriptAnalyzer(api_key=None if force_mock else api_key)
    
    all_lines = []
    characters = []
    current_line_idx = 0

    for chunk in chunks:
        print(f"      Processing chunk {chunk.index + 1}/{len(chunks)} ({chunk.word_count} words)...")
        lines, characters = await analyzer.analyze_scene(
            scene_text=chunk.text,
            existing_characters=characters,
            start_line_index=current_line_idx
        )
        all_lines.extend(lines)
        current_line_idx += len(lines)

    print(f"\n      ✓ Analysis complete! Generated {len(all_lines)} script lines.")
    print(f"      ✓ Discovered {len(characters)} character(s) in ledger:")
    for char in characters:
        print(f"        • [{char.id}] {char.name} ({char.color_accent or 'no color'})")

    # 4. Strict 100% Word-for-Word Verification
    print("\n[4/4] Verifying 100% Word-for-Word preservation...")
    verification = WordDiffVerifier.verify(raw_text, all_lines)

    print(f"      Fidelity Score: {verification.fidelity_percentage}%")
    print(f"      Source Words:   {verification.source_word_count}")
    print(f"      Script Words:   {verification.script_word_count}")

    if verification.is_valid:
        print("      \033[92mSUCCESS: 100% word-for-word preservation verified! Zero drift detected.\033[0m")
    else:
        print(f"      \033[93mWARNING: {len(verification.mismatches)} mismatch(es) detected:\033[0m")
        for m in verification.mismatches[:5]:
            print(f"        - Near line {m.approx_line_index}: diff {m.source_words} vs {m.script_words}")

    # Display preview sample of script lines
    print("\n" + "-" * 70)
    print(" SCRIPT PREVIEW (First 8 lines)")
    print("-" * 70)
    for line in all_lines[:8]:
        type_badge = "DIALOGUE " if line.type == "dialogue" else "NARRATION"
        conf_badge = f"[{line.confidence.upper()}]" if line.confidence != "high" else ""
        cues = f" | SFX: {', '.join([c.tag for c in line.sound_cues])}" if line.sound_cues else ""
        delivery = f" | ({line.delivery.emotion})" if line.delivery and line.delivery.emotion else ""
        print(f"#{line.line_index:03d} [{type_badge}] {line.speaker_id.upper()}{delivery}{cues} {conf_badge}")
        # Truncate text preview for display
        text_disp = line.text if len(line.text) <= 90 else line.text[:87] + "..."
        print(f"     \"{text_disp.strip()}\"\n")

    # Save to JSON
    if output_path:
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        doc = ScriptDocument(
            project_id="cli_sample",
            title=Path(input_path).stem.replace("_", " ").title(),
            raw_text=raw_text,
            characters=characters,
            lines=all_lines,
            total_words=total_words,
            created_at="now",
            updated_at="now"
        )
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(doc.model_dump(), f, indent=2)
        print(f"\n✓ Exported script JSON to: {out_file.resolve()}")

    return verification.is_valid


def main():
    parser = argparse.ArgumentParser(description="CastVoice Script Analysis & Verification CLI")
    parser.add_argument(
        "--input", "-i",
        default=str(backend_dir.parent / "data" / "samples" / "scandal_in_bohemia_excerpt.txt"),
        help="Path to input text file (.txt, .md)"
    )
    parser.add_argument(
        "--output", "-o",
        default=str(backend_dir.parent / "data" / "samples" / "sample_script.json"),
        help="Path to output JSON file"
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Force offline mock analyzer even if GEMINI_API_KEY is present"
    )

    args = parser.parse_args()
    success = asyncio.run(run_pipeline(args.input, args.output, args.mock))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
