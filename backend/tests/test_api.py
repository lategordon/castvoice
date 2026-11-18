import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_create_and_analyze_project():
    sample_text = (
        'Holmes leaned back in his armchair. "The case is remarkable," said he.\n'
        '"Indeed," whispered Watson. "What is our next step?"'
    )

    # 1. Create project
    create_res = client.post("/api/projects", json={
        "title": "Test Mystery",
        "text": sample_text
    })
    assert create_res.status_code == 200
    project_meta = create_res.json()
    project_id = project_meta["id"]
    assert project_id.startswith("proj_")

    # 2. Analyze project
    analyze_res = client.post(f"/api/projects/{project_id}/analyze", json={"force_mock": True})
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["verification"]["is_valid"] is True
    assert len(data["script"]["lines"]) > 0
    assert len(data["script"]["characters"]) >= 2

    # 3. Patch line
    first_line = data["script"]["lines"][0]
    patch_res = client.patch(
        f"/api/projects/{project_id}/lines/{first_line['id']}",
        json={"emotion": "deep in thought", "pace": "slow"}
    )
    assert patch_res.status_code == 200
    patched_line = patch_res.json()
    assert patched_line["delivery"]["emotion"] == "deep in thought"

    # 4. List voices
    voices_res = client.get("/api/voices")
    assert voices_res.status_code == 200
    assert len(voices_res.json()) >= 3
