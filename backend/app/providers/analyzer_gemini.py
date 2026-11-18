import os
import re
import json
import uuid
from typing import List, Dict, Any, Optional, Tuple

from app.models.script import (
    Character,
    ScriptLine,
    LineType,
    ConfidenceLevel,
    DeliveryDirection,
    SoundCue,
    SoundCuePlacement,
    LLMSceneAnalysisResponse,
)
from app.providers.base import ScriptAnalyzer

# Palette for distinct character UI accents
ACCENT_COLORS = [
    "#3B82F6",  # Blue
    "#10B981",  # Emerald
    "#F59E0B",  # Amber
    "#EC4899",  # Pink
    "#8B5CF6",  # Purple
    "#06B6D4",  # Cyan
    "#F97316",  # Orange
    "#84CC16",  # Lime
    "#6366F1",  # Indigo
    "#14B8A6",  # Teal
]


def slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    slug = re.sub(r"[\s-]+", "_", slug).strip("_")
    return slug or "speaker"


class GeminiScriptAnalyzer(ScriptAnalyzer):
    """
    Script analyzer using Google Gemini with structured Pydantic outputs.
    Includes offline mock mode for testing without an API key.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-3.8-flash", force_mock: bool = False):
        if force_mock:
            self.api_key = None
        else:
            self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY")
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        self.client = None

        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[GeminiScriptAnalyzer] Warning: could not initialize genai client: {e}")

    async def analyze_scene(
        self,
        scene_text: str,
        existing_characters: List[Character],
        start_line_index: int = 0
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Processes a scene chunk into verbatim script lines and updates character ledger.
        """
        if self.client:
            return await self._analyze_with_gemini(scene_text, existing_characters, start_line_index)
        else:
            return self._analyze_mock(scene_text, existing_characters, start_line_index)

    async def analyze_podcast_conversation(
        self,
        article_text: str,
        article_title: str = "Web Article",
        host1_name: str = "Alex",
        host2_name: str = "Jordan",
        format_mode: str = "single_episode",
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Transforms article text into a dynamic two-host conversational podcast (NotebookLM style).
        """
        if self.client:
            return await self._analyze_podcast_with_gemini(
                article_text, article_title, host1_name, host2_name, format_mode
            )
        else:
            return self._analyze_podcast_mock(
                article_text, article_title, host1_name, host2_name, format_mode
            )

    async def analyze_narrated_article(
        self,
        article_text: str,
        article_title: str = "Web Article",
        format_mode: str = "single_episode",
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Transforms article text into a chaptered audiobook/audio article with section stingers
        and distinct character attribution for direct quotes.
        """
        if self.client:
            return await self._analyze_narrated_with_gemini(article_text, article_title, format_mode)
        else:
            return self._analyze_narrated_mock(article_text, article_title, format_mode)

    async def _analyze_with_gemini(
        self,
        scene_text: str,
        existing_characters: List[Character],
        start_line_index: int = 0
    ) -> Tuple[List[ScriptLine], List[Character]]:
        from google.genai import types
        import asyncio

        character_context = []
        for char in existing_characters:
            aliases_str = f" (aliases: {', '.join(char.aliases)})" if char.aliases else ""
            character_context.append(f"- {char.name}{aliases_str} [id: {char.id}]")

        ledger_desc = "\n".join(character_context) if character_context else "None yet."

        prompt = f"""You are a professional audio dramatist and script supervisor adapting prose into a full-cast audio play.

### INVIOLABLE CONSTRAINT:
PRESERVE 100% OF THE AUTHOR'S WORDS VERBATIM.
DO NOT rephrase, do not summarize, do not skip words, and do not invent new dialogue.
Every single word of dialogue and narration in the input MUST be present in the output lines, in exact sequential order.
If a sentence has dialogue interrupted by speech attribution (e.g. '"Indeed," said Holmes, "it is elementary."'), split it into sequential lines:
  Line 1 (dialogue, Sherlock Holmes): '"Indeed,"'
  Line 2 (narration, Narrator): 'said Holmes,'
  Line 3 (dialogue, Sherlock Holmes): '"it is elementary."'

### CHARACTER LEDGER:
Existing characters in this story so far:
{ledger_desc}

RULES:
1. Always map known characters to their established names. Do not create duplicates for the same person.
2. Resolve pronoun references ('he said', 'she whispered') and unattributed dialogue to the correct speaker based on scene context.
3. If speaker attribution is genuinely ambiguous, set confidence to 'low'.
4. Narration lines must always have speaker_name = "Narrator".
5. Add delivery cues (emotion, pace, volume) based on the text.
6. If an acoustic event occurs (footsteps, thunder, doors, sighing, weeping), add a sound cue tag with placement ('before', 'during', or 'after').

### INPUT PROSE SCENE:
{scene_text}
"""

        # Retry loop for temporary 503 or rate limits
        last_exception = None
        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LLMSceneAnalysisResponse,
                        temperature=0.1,
                    ),
                )
                raw_json = response.text
                parsed = LLMSceneAnalysisResponse.model_validate_json(raw_json)
                return self._build_script_lines_and_ledger(parsed, scene_text, existing_characters, start_line_index)
            except Exception as e:
                last_exception = e
                print(f"[GeminiScriptAnalyzer] Attempt {attempt + 1} encountered: {e}. Retrying in {attempt + 1}s...")
                await asyncio.sleep(attempt + 1)

        print(f"[GeminiScriptAnalyzer] Live Gemini API call failed after 3 attempts ({last_exception}); falling back to offline deterministic parser.")
        return self._analyze_mock(scene_text, existing_characters, start_line_index)

    def _analyze_mock(
        self,
        scene_text: str,
        existing_characters: List[Character],
        start_line_index: int = 0
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        High-fidelity deterministic offline regex parser for local testing without an API key.
        Guarantees 100% word-for-word preservation by segmenting text into dialogue vs narration.
        """
        # Ensure Narrator exists in character ledger
        characters_by_id: Dict[str, Character] = {c.id: c for c in existing_characters}
        if "narrator" not in characters_by_id:
            characters_by_id["narrator"] = Character(
                id="narrator",
                name="Narrator",
                gender_presentation="neutral",
                color_accent="#64748B"
            )

        # Regex to segment dialogue in double quotes or single quotes vs surrounding narration
        # Handles quotes while preserving every character
        pattern = re.compile(r'([“"\'«][^“”"\'»\n]+[”"\'»])')
        tokens = pattern.split(scene_text)

        script_lines: List[ScriptLine] = []
        current_index = start_line_index
        last_dialogue_speaker = None

        for token in tokens:
            if not token:
                continue

            stripped = token.strip()
            if not stripped:
                continue

            is_quote = (
                (token.startswith('"') and token.endswith('"')) or
                (token.startswith('“') and token.endswith('”')) or
                (token.startswith("'") and token.endswith("'") and len(token) > 4)
            )

            if is_quote:
                # Guess speaker from context or use character ledger
                speaker_id = self._guess_speaker(token, characters_by_id, last_dialogue_speaker)
                last_dialogue_speaker = speaker_id
                
                # Check for emotion in dialogue
                emotion = "conversational"
                if "!" in token:
                    emotion = "emphatic, energetic"
                elif "?" in token:
                    emotion = "inquisitive"

                script_lines.append(
                    ScriptLine(
                        id=f"line_{uuid.uuid4().hex[:8]}",
                        line_index=current_index,
                        type=LineType.DIALOGUE,
                        speaker_id=speaker_id,
                        text=token,
                        delivery=DeliveryDirection(emotion=emotion, volume="normal"),
                        confidence=ConfidenceLevel.MEDIUM if speaker_id != "narrator" else ConfidenceLevel.LOW
                    )
                )
            else:
                # Narration text
                sound_cues = []
                # Check for acoustic keywords
                lowered = token.lower()
                if "door" in lowered and ("open" in lowered or "shut" in lowered or "creak" in lowered):
                    sound_cues.append(SoundCue(
                        id=f"cue_{uuid.uuid4().hex[:6]}",
                        tag="door creaks",
                        placement=SoundCuePlacement.AFTER
                    ))
                elif "rain" in lowered or "storm" in lowered:
                    sound_cues.append(SoundCue(
                        id=f"cue_{uuid.uuid4().hex[:6]}",
                        tag="rain on window",
                        placement=SoundCuePlacement.DURING
                    ))
                elif "step" in lowered or "walk" in lowered or "footstep" in lowered:
                    sound_cues.append(SoundCue(
                        id=f"cue_{uuid.uuid4().hex[:6]}",
                        tag="footsteps",
                        placement=SoundCuePlacement.BEFORE
                    ))

                # Also scan narration for potential speaker names to populate ledger
                self._scan_narration_for_characters(token, characters_by_id)

                script_lines.append(
                    ScriptLine(
                        id=f"line_{uuid.uuid4().hex[:8]}",
                        line_index=current_index,
                        type=LineType.NARRATION,
                        speaker_id="narrator",
                        text=token,
                        sound_cues=sound_cues,
                        confidence=ConfidenceLevel.HIGH
                    )
                )

            current_index += 1

        return script_lines, list(characters_by_id.values())

    def _guess_speaker(
        self,
        quote_text: str,
        characters_by_id: Dict[str, Character],
        last_speaker: Optional[str]
    ) -> str:
        # Known character IDs excluding narrator
        non_narrator = [cid for cid in characters_by_id.keys() if cid != "narrator"]
        if not non_narrator:
            # Default to a generic speaker if no characters discovered yet
            char_id = "character_1"
            characters_by_id[char_id] = Character(
                id=char_id,
                name="Character 1",
                color_accent=ACCENT_COLORS[1]
            )
            return char_id

        # In dialogue turns, alternate if possible
        if len(non_narrator) >= 2 and last_speaker in non_narrator:
            other_speakers = [s for s in non_narrator if s != last_speaker]
            return other_speakers[0]
        return non_narrator[0]

    def _scan_narration_for_characters(self, text: str, characters_by_id: Dict[str, Character]):
        # Common detection of proper names following speech tags: said Holmes, answered Watson
        matches = re.findall(r"(?:said|replied|asked|cried|whispered|remarked|answered|exclaimed)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text)
        for name in matches:
            cid = slugify(name)
            if cid not in characters_by_id and cid != "narrator":
                color_idx = len(characters_by_id) % len(ACCENT_COLORS)
                characters_by_id[cid] = Character(
                    id=cid,
                    name=name,
                    color_accent=ACCENT_COLORS[color_idx]
                )

    def _build_script_lines_and_ledger(
        self,
        llm_response: LLMSceneAnalysisResponse,
        scene_text: str,
        existing_characters: List[Character],
        start_line_index: int = 0
    ) -> Tuple[List[ScriptLine], List[Character]]:
        characters_by_name: Dict[str, Character] = {}
        characters_by_id: Dict[str, Character] = {}

        # Pre-seed existing characters
        for char in existing_characters:
            characters_by_id[char.id] = char
            characters_by_name[char.name.lower()] = char
            for alias in char.aliases:
                characters_by_name[alias.lower()] = char

        # Ensure narrator is present
        if "narrator" not in characters_by_id:
            narrator = Character(
                id="narrator",
                name="Narrator",
                gender_presentation="neutral",
                color_accent="#64748B"
            )
            characters_by_id["narrator"] = narrator
            characters_by_name["narrator"] = narrator

        # Register LLM characters
        for item in llm_response.characters:
            norm_name = item.name.strip()
            if not norm_name or norm_name.lower() == "narrator":
                continue
            
            key = norm_name.lower()
            if key not in characters_by_name:
                cid = slugify(norm_name)
                # Avoid ID collisions
                counter = 1
                base_cid = cid
                while cid in characters_by_id and characters_by_id[cid].name.lower() != key:
                    cid = f"{base_cid}_{counter}"
                    counter += 1

                color_idx = len(characters_by_id) % len(ACCENT_COLORS)
                new_char = Character(
                    id=cid,
                    name=norm_name,
                    aliases=item.aliases,
                    gender_presentation=item.gender_presentation,
                    color_accent=ACCENT_COLORS[color_idx]
                )
                characters_by_id[cid] = new_char
                characters_by_name[key] = new_char
                for alias in item.aliases:
                    characters_by_name[alias.lower()] = new_char

        # Build ScriptLines
        script_lines: List[ScriptLine] = []
        for i, line_out in enumerate(llm_response.lines):
            line_idx = start_line_index + i
            speaker_key = line_out.speaker_name.strip().lower()

            if line_out.type == LineType.NARRATION or speaker_key == "narrator":
                speaker_id = "narrator"
            else:
                matched_char = characters_by_name.get(speaker_key)
                if matched_char:
                    speaker_id = matched_char.id
                else:
                    # Dynamically add if not yet present
                    cid = slugify(line_out.speaker_name)
                    color_idx = len(characters_by_id) % len(ACCENT_COLORS)
                    new_char = Character(
                        id=cid,
                        name=line_out.speaker_name.strip(),
                        color_accent=ACCENT_COLORS[color_idx]
                    )
                    characters_by_id[cid] = new_char
                    characters_by_name[speaker_key] = new_char
                    speaker_id = cid

            delivery = None
            if line_out.delivery_emotion or line_out.delivery_pace or line_out.delivery_volume:
                delivery = DeliveryDirection(
                    emotion=line_out.delivery_emotion,
                    pace=line_out.delivery_pace,
                    volume=line_out.delivery_volume
                )

            sound_cues = []
            if line_out.sound_cue_tag:
                placement = line_out.sound_cue_placement or SoundCuePlacement.DURING
                sound_cues.append(
                    SoundCue(
                        id=f"cue_{uuid.uuid4().hex[:6]}",
                        tag=line_out.sound_cue_tag,
                        placement=placement
                    )
                )

            script_lines.append(
                ScriptLine(
                    id=f"line_{uuid.uuid4().hex[:8]}",
                    line_index=line_idx,
                    type=line_out.type,
                    speaker_id=speaker_id,
                    text=line_out.text,
                    delivery=delivery,
                    sound_cues=sound_cues,
                    confidence=line_out.confidence
                )
            )

        return script_lines, list(characters_by_id.values())

    async def _analyze_podcast_with_gemini(
        self,
        article_text: str,
        article_title: str,
        host1_name: str,
        host2_name: str,
        format_mode: str,
    ) -> Tuple[List[ScriptLine], List[Character]]:
        from google.genai import types
        import asyncio

        length_guidance = (
            "Synthesize the entire article into a single cohesive, deeply engaging episode (approx 20-35 conversational turns)."
            if format_mode == "single_episode"
            else "Break the long read into a multi-part series, marking each major part/chapter clearly with transition cues."
        )

        prompt = f"""You are a master podcast producer and host adapting a longform written article into a lively, high-production two-host conversational podcast (similar to NotebookLM deep dives).

### HOST ROLES:
- **{host1_name}**: Curious, relatable, conversational, asks probing questions, frames analogies, reacts with genuine interest.
- **{host2_name}**: Analytical, deeply informed on the material, unpacks nuance, explains evidence and mechanisms, synthesizes takeaways.

### GUIDELINES:
1. {length_guidance}
2. The hosts should NOT just read the article; they should discuss, debate, explain, and unpack its core ideas, surprising facts, and implications with authentic conversational chemistry.
3. Include natural dialogue interactions: back-and-forth questions, active listening affirmations ("Totally", "That's a great point", "Wait, really?"), and thoughtful pauses.
4. On the very first line by {host1_name}, attach sound_cue_tag="podcast intro" with sound_cue_placement="before".
5. Between major topic shifts or episode parts, attach sound_cue_tag="podcast transition" with sound_cue_placement="before".
6. On the final concluding sign-off line, attach sound_cue_tag="podcast outro" with sound_cue_placement="after".
7. All dialogue lines must have type="dialogue", and speaker_name must be either "{host1_name}" or "{host2_name}".

### SOURCE ARTICLE:
Title: {article_title}

{article_text}
"""

        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LLMSceneAnalysisResponse,
                        temperature=0.7,
                    ),
                )
                parsed = LLMSceneAnalysisResponse.model_validate_json(response.text)
                
                # Pre-seed host characters with default voices
                host1_id = slugify(host1_name)
                host2_id = slugify(host2_name)
                seed_chars = [
                    Character(
                        id=host1_id,
                        name=host1_name,
                        gender_presentation="male",
                        voice_id="en-US-GuyNeural",
                        color_accent="#3B82F6",
                    ),
                    Character(
                        id=host2_id,
                        name=host2_name,
                        gender_presentation="female",
                        voice_id="en-US-JennyNeural",
                        color_accent="#EC4899",
                    ),
                ]
                return self._build_script_lines_and_ledger(parsed, article_text, seed_chars, start_line_index=0)
            except Exception as e:
                print(f"[GeminiPodcast] Attempt {attempt + 1} failed: {e}. Retrying...")
                await asyncio.sleep(attempt + 1)

        print("[GeminiPodcast] Falling back to offline deterministic podcast generator.")
        return self._analyze_podcast_mock(article_text, article_title, host1_name, host2_name, format_mode)

    def _analyze_podcast_mock(
        self,
        article_text: str,
        article_title: str,
        host1_name: str,
        host2_name: str,
        format_mode: str,
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Deterministic offline generator for two-host podcast conversations.
        """
        host1_id = slugify(host1_name)
        host2_id = slugify(host2_name)
        characters = [
            Character(
                id=host1_id,
                name=host1_name,
                gender_presentation="male",
                voice_id="en-US-GuyNeural",
                color_accent="#3B82F6",
            ),
            Character(
                id=host2_id,
                name=host2_name,
                gender_presentation="female",
                voice_id="en-US-JennyNeural",
                color_accent="#EC4899",
            ),
        ]

        lines: List[ScriptLine] = []
        line_idx = 0

        # Intro line
        lines.append(
            ScriptLine(
                id=f"line_{uuid.uuid4().hex[:8]}",
                line_index=line_idx,
                type=LineType.DIALOGUE,
                speaker_id=host1_id,
                text=f"Welcome back to the Deep Dive! Today we're looking at '{article_title}'. {host2_name}, this piece has some really fascinating insights.",
                delivery=DeliveryDirection(emotion="warm, enthusiastic", pace="normal"),
                sound_cues=[
                    SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="podcast intro", placement=SoundCuePlacement.BEFORE)
                ],
                confidence=ConfidenceLevel.HIGH,
            )
        )
        line_idx += 1

        lines.append(
            ScriptLine(
                id=f"line_{uuid.uuid4().hex[:8]}",
                line_index=line_idx,
                type=LineType.DIALOGUE,
                speaker_id=host2_id,
                text=f"It really does, {host1_name}. What struck me most right out of the gate is how directly it addresses questions people have been wrestling with.",
                delivery=DeliveryDirection(emotion="thoughtful, engaged"),
                confidence=ConfidenceLevel.HIGH,
            )
        )
        line_idx += 1

        # Break text into paragraphs
        raw_paragraphs = [p.strip() for p in re.split(r"\n\s*\n", article_text) if p.strip()]
        selected_paragraphs = raw_paragraphs[:12] if format_mode == "single_episode" else raw_paragraphs

        speakers = [host1_id, host2_id]
        for i, para in enumerate(selected_paragraphs):
            # Check for heading
            if para.startswith("#"):
                clean_heading = re.sub(r"^#+\s*", "", para)
                lines.append(
                    ScriptLine(
                        id=f"line_{uuid.uuid4().hex[:8]}",
                        line_index=line_idx,
                        type=LineType.DIALOGUE,
                        speaker_id=speakers[i % 2],
                        text=f"That brings us to a major section here: '{clean_heading}'. Let's dig into what this means.",
                        delivery=DeliveryDirection(emotion="curious, transitioning"),
                        sound_cues=[
                            SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="podcast transition", placement=SoundCuePlacement.BEFORE)
                        ],
                        confidence=ConfidenceLevel.HIGH,
                    )
                )
                line_idx += 1
                continue

            spk = speakers[i % 2]
            other_spk = host2_name if spk == host1_id else host1_name
            # Natural dialogue phrasing
            if i % 3 == 0:
                dialogue_text = f"Here's the key point: {para}"
            elif i % 3 == 1:
                dialogue_text = f"Right! And as the author highlights, {para}"
            else:
                dialogue_text = f"That makes total sense, {other_spk}. Especially when you consider that {para}"

            lines.append(
                ScriptLine(
                    id=f"line_{uuid.uuid4().hex[:8]}",
                    line_index=line_idx,
                    type=LineType.DIALOGUE,
                    speaker_id=spk,
                    text=dialogue_text,
                    delivery=DeliveryDirection(emotion="conversational"),
                    confidence=ConfidenceLevel.HIGH,
                )
            )
            line_idx += 1

        # Outro line
        lines.append(
            ScriptLine(
                id=f"line_{uuid.uuid4().hex[:8]}",
                line_index=line_idx,
                type=LineType.DIALOGUE,
                speaker_id=host1_id,
                text=f"That wraps up our deep dive into '{article_title}'. Thanks for tuning in with us, and we'll catch you on the next episode!",
                delivery=DeliveryDirection(emotion="warm, concluding"),
                sound_cues=[
                    SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="podcast outro", placement=SoundCuePlacement.AFTER)
                ],
                confidence=ConfidenceLevel.HIGH,
            )
        )

        return lines, characters

    async def _analyze_narrated_with_gemini(
        self,
        article_text: str,
        article_title: str,
        format_mode: str,
    ) -> Tuple[List[ScriptLine], List[Character]]:
        from google.genai import types
        import asyncio

        prompt = f"""You are a professional audiobook and audio essay producer adapting a longform written article into a polished chaptered audio reading.

### GUIDELINES:
1. Preserve the article's text faithfully in clear sequential order.
2. The primary speaker is the "Narrator" (speaker_name="Narrator", type="narration").
3. When direct speech or quotes appear in the text (e.g. from interviewees, experts, or quoted people), assign them to distinct speaker names with type="dialogue".
4. Whenever a major section or heading appears in the text, attach sound_cue_tag="chapter stinger" with sound_cue_placement="before" to the line introducing that chapter.
5. On the final concluding line, attach sound_cue_tag="podcast outro" with sound_cue_placement="after".

### ARTICLE:
Title: {article_title}

{article_text}
"""

        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LLMSceneAnalysisResponse,
                        temperature=0.2,
                    ),
                )
                parsed = LLMSceneAnalysisResponse.model_validate_json(response.text)
                return self._build_script_lines_and_ledger(parsed, article_text, [], start_line_index=0)
            except Exception as e:
                print(f"[GeminiNarrated] Attempt {attempt + 1} failed: {e}. Retrying...")
                await asyncio.sleep(attempt + 1)

        print("[GeminiNarrated] Falling back to offline deterministic chaptered narrator.")
        return self._analyze_narrated_mock(article_text, article_title, format_mode)

    def _analyze_narrated_mock(
        self,
        article_text: str,
        article_title: str,
        format_mode: str,
    ) -> Tuple[List[ScriptLine], List[Character]]:
        """
        Deterministic offline generator for chaptered audio article narration.
        """
        characters_by_id: Dict[str, Character] = {
            "narrator": Character(
                id="narrator",
                name="Narrator",
                gender_presentation="neutral",
                voice_id="en-US-GuyNeural",
                color_accent="#64748B",
            )
        }

        lines: List[ScriptLine] = []
        line_idx = 0

        # Title introduction line
        lines.append(
            ScriptLine(
                id=f"line_{uuid.uuid4().hex[:8]}",
                line_index=line_idx,
                type=LineType.NARRATION,
                speaker_id="narrator",
                text=f"{article_title}.",
                delivery=DeliveryDirection(emotion="formal, clear", pace="measured"),
                sound_cues=[
                    SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="chapter stinger", placement=SoundCuePlacement.BEFORE)
                ],
                confidence=ConfidenceLevel.HIGH,
            )
        )
        line_idx += 1

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", article_text) if p.strip()]
        for p in paragraphs:
            if p.startswith("#"):
                clean_heading = re.sub(r"^#+\s*", "", p)
                lines.append(
                    ScriptLine(
                        id=f"line_{uuid.uuid4().hex[:8]}",
                        line_index=line_idx,
                        type=LineType.NARRATION,
                        speaker_id="narrator",
                        text=f"Chapter: {clean_heading}.",
                        delivery=DeliveryDirection(emotion="measured"),
                        sound_cues=[
                            SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="chapter stinger", placement=SoundCuePlacement.BEFORE)
                        ],
                        confidence=ConfidenceLevel.HIGH,
                    )
                )
                line_idx += 1
            else:
                # Check if paragraph is a direct quote
                if (p.startswith('"') and p.endswith('"')) or (p.startswith('“') and p.endswith('”')):
                    expert_id = "quoted_expert"
                    if expert_id not in characters_by_id:
                        characters_by_id[expert_id] = Character(
                            id=expert_id,
                            name="Quoted Speaker",
                            gender_presentation="female",
                            voice_id="en-US-JennyNeural",
                            color_accent="#10B981",
                        )
                    lines.append(
                        ScriptLine(
                            id=f"line_{uuid.uuid4().hex[:8]}",
                            line_index=line_idx,
                            type=LineType.DIALOGUE,
                            speaker_id=expert_id,
                            text=p,
                            delivery=DeliveryDirection(emotion="reflective"),
                            confidence=ConfidenceLevel.HIGH,
                        )
                    )
                else:
                    lines.append(
                        ScriptLine(
                            id=f"line_{uuid.uuid4().hex[:8]}",
                            line_index=line_idx,
                            type=LineType.NARRATION,
                            speaker_id="narrator",
                            text=p,
                            delivery=DeliveryDirection(emotion="clear"),
                            confidence=ConfidenceLevel.HIGH,
                        )
                    )
                line_idx += 1

        # Outro cue on the last line
        if lines:
            lines[-1].sound_cues.append(
                SoundCue(id=f"cue_{uuid.uuid4().hex[:6]}", tag="podcast outro", placement=SoundCuePlacement.AFTER)
            )

        return lines, list(characters_by_id.values())
