import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Settings:
    def __init__(self):
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        self.host: str = os.getenv("HOST", "127.0.0.1")
        self.port: int = int(os.getenv("PORT", "8000"))
        
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.data_dir: Path = root_dir / os.getenv("DATA_DIR", "data")
        self.projects_dir: Path = root_dir / os.getenv("PROJECTS_DIR", "data/projects")
        self.sound_library_dir: Path = root_dir / os.getenv("SOUND_LIBRARY_DIR", "data/sound_library")
        self.default_tts_provider: str = os.getenv("DEFAULT_TTS_PROVIDER", "edge-tts")

        # Ensure directories exist
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.sound_library_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
