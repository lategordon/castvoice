from app.core.config import settings
from app.services.project_store import ProjectStore

project_store = ProjectStore(base_dir=settings.projects_dir)


def get_project_store() -> ProjectStore:
    return project_store
