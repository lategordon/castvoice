# CastVoice 🎙️🎭

**CastVoice** is an open-source creator tool designed for indie authors and serial fiction writers. It transforms an author's raw prose into a full-cast, multi-speaker audio play with automatic character attribution, delivery directions, Foley sound effects, and synchronized transcript playback—all while strictly preserving the author's words 100% verbatim.

---

## Features

1. **Upload & Ingest**: Paste text or upload `.txt` / `.md` (up to ~5,000 words per scene/chapter).
2. **AI Script Analysis**:
   - Converts prose into distinct narrator and dialogue lines.
   - Solves speaker attribution for unattributed lines and pronoun references.
   - Maintains a consistent Character Ledger across scene chunks.
   - Attaches delivery direction (emotion, pacing, volume).
   - Inserts acoustic Foley cues (`[door creaks]`, `[rain on window]`, `[footsteps]`) mapped to audio files.
   - Flags ambiguous lines with `confidence: "low"` for author review.
   - **Zero Rewriting Guarantee**: Automatic token-level diff verification ensures 100% word-for-word fidelity against the raw prose.
3. **Interactive Script Editor**:
   - Reassign speakers with one click.
   - Inline directorial delivery editing.
   - Merge duplicate characters and rename characters with immediate cross-script updates.
   - Single-line audio audition button to preview any line in isolation.
4. **Voice Casting**:
   - Curated catalog of neural voices with distinctive genders, accents, and tones.
   - Instant audition sample playback for each character and the narrator.
5. **Render & Audio Mixing**:
   - Line-by-line neural TTS synthesis with inter-line pauses.
   - Foley sound cue mixing with automatic background audio ducking (-6 dB under speech).
   - Smart line caching: only re-synthesizes lines that have been edited.
   - Exports master full-cast MP3 and timestamp manifest.
6. **In-Browser Player with Synchronized Transcript**:
   - Play/pause, scrubbing, skip ±5s, and speed controls (0.75x – 1.5x).
   - Real-time transcript tracking that auto-scrolls to and highlights the active speaking line.
   - Click any dialogue line in the transcript to instantly jump playback to that timestamp.

---

## Architecture & Tech Stack

```text
castvoice/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # REST endpoints (projects, analysis, voices, render)
│   │   ├── core/config.py     # Environment settings (.env)
│   │   ├── models/            # Pydantic schemas (ScriptDocument, Character, ScriptLine)
│   │   ├── providers/         # Provider pattern ABCs (Gemini analyzer, EdgeTTS, Foley)
│   │   ├── services/          # Verifier (word diff), Ingestion, ProjectStore, AudioMixer
│   │   └── main.py            # FastAPI entry point & static SPA mount
│   ├── tests/                 # Pytest test suite
│   ├── requirements.txt
│   └── cli_test.py            # Standalone CLI analysis test script
├── frontend/                  # React (Vite) + Tailwind CSS + Lucide icons
│   ├── src/components/        # UploadView, ScriptEditor, VoiceCasting, PlayerView
│   ├── src/types/             # TypeScript interfaces mirroring Pydantic models
│   └── dist/                  # Compiled production SPA (served directly by FastAPI)
├── data/
│   ├── samples/               # Public domain sample story (Sherlock Holmes)
│   ├── sound_library/         # Bundled Foley sound effects (.wav)
│   └── projects/              # File-based local storage (projects/{id}/...)
├── .env.example
├── start.sh
└── README.md
```

---

## Quick Start & Local Setup

### 1. Prerequisites
- **Python 3.10+** (tested with Python 3.14)
- **Node.js 18+** & `npm`
- **FFmpeg**:
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
  - Windows: `winget install Gyan.FFmpeg`

### 2. Clone & Configure Environment
```bash
# Copy example environment configuration
cp .env.example .env
```

Edit `.env` to configure your Gemini API Key:
```env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
DEFAULT_TTS_PROVIDER=edge-tts
```

#### How to get a free Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** → **Create API key**.
4. Copy the key and paste it into `.env` as `GEMINI_API_KEY`.
*(Note: If no API key is provided, CastVoice automatically runs in offline mock mode using its deterministic regex parser for local testing!)*

### 3. Setup Backend
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt audioop-lts
```

### 4. Build or Run Frontend
```bash
# Option A: One-step production build (served directly by FastAPI at port 8000)
cd frontend
npm install
npm run build
cd ..

# Option B: Run with live Vite Hot Module Replacement (for frontend development)
cd frontend
npm run dev
```

### 5. Launch CastVoice!
With the virtual environment activated:
```bash
# Run the FastAPI server
PYTHONPATH=backend python3 backend/app/main.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## Running the CLI Script Pipeline (Milestone a)

You can run the script analysis and 100% word-for-word diff verification directly from the command line:

```bash
# Run on the bundled Sherlock Holmes excerpt
PYTHONPATH=backend ./venv/bin/python3 backend/cli_test.py

# Force offline mock parser (runs with zero external API calls)
PYTHONPATH=backend ./venv/bin/python3 backend/cli_test.py --mock

# Run on your own text file and export to JSON
PYTHONPATH=backend ./venv/bin/python3 backend/cli_test.py --input path/to/my_story.txt --output my_script.json
```

---

## Running Automated Tests

```bash
PYTHONPATH=backend ./venv/bin/pytest backend/tests -v
```

All 8 unit and integration tests will execute:
- Word-for-word token diff verification (validating zero dropped or hallucinated words).
- Scene chunking and paragraph boundary preservation.
- Pydantic structured output validation.
- FastAPI endpoints (project creation, script patching, character rename/merge, voice list).

---

## Included Sample Story

A public-domain excerpt from Sir Arthur Conan Doyle's *A Scandal in Bohemia* is pre-loaded at `data/samples/scandal_in_bohemia_excerpt.txt`.
You can load it with a single click in the UI via the **Load Sample Story** button.

---

## License

MIT License. Free and open source for authors and creators.
