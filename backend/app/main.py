from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import projects, analysis, voices, render
from app.core.config import settings

app = FastAPI(
    title="CastVoice API",
    description="Full-cast audio play script generation and synthesis platform",
    version="0.1.0"
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in dev mode (Vite at localhost:5173, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(projects.router)
app.include_router(analysis.router)
app.include_router(voices.router)
app.include_router(render.router)

# Serve generated sound library as static files
sound_dir = settings.sound_library_dir
if sound_dir.exists():
    app.mount("/static/sounds", StaticFiles(directory=str(sound_dir)), name="sounds")

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "CastVoice API",
        "default_tts": settings.default_tts_provider,
        "gemini_model": settings.gemini_model,
        "has_gemini_key": bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here")
    }


# Mount built frontend if it exists (must be last to allow API routes precedence)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def index_fallback():
        return {
            "status": "warning",
            "message": "CastVoice API is running, but frontend/dist has not been built yet.",
            "instructions": "Run ./start.sh or 'cd frontend && npm run build' to build the UI."
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
