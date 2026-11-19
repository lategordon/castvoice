import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.document_extractor import DocumentExtractor

client = TestClient(app)

SAMPLE_PDF_BYTES = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 53 >> stream
BT
/F1 24 Tf
100 700 Td
(The Mystery of the Cast Voice) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000348 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
424
%%EOF"""


def test_extract_pdf_service():
    result = DocumentExtractor.extract_from_bytes(SAMPLE_PDF_BYTES, "mystery_cast.pdf")
    assert result["file_type"] == "pdf"
    assert "The Mystery of the Cast Voice" in result["text"]
    assert result["num_pages"] == 1
    assert result["word_count"] == 6
    assert result["title"] == "Mystery Cast"


def test_extract_markdown_service():
    md_content = b"# The Great Voyage\n\nBy Captain Nemo\n\nThe submarine dove deep into the abyss."
    result = DocumentExtractor.extract_from_bytes(md_content, "voyage.md")
    assert result["file_type"] == "md"
    assert result["title"] == "The Great Voyage"
    assert "submarine dove deep" in result["text"]
    assert result["word_count"] > 5


def test_parse_document_api_endpoint():
    files = {"file": ("test_story.pdf", SAMPLE_PDF_BYTES, "application/pdf")}
    res = client.post("/api/projects/parse-document", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["file_type"] == "pdf"
    assert "The Mystery of the Cast Voice" in data["text"]
    assert data["num_pages"] == 1


def test_upload_project_with_pdf():
    files = {"file": ("audio_play_sample.pdf", SAMPLE_PDF_BYTES, "application/pdf")}
    res = client.post("/api/projects/upload", files=files, data={"title": "Custom PDF Project"})
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Custom PDF Project"
    assert "id" in data

    # Verify script content
    script_res = client.get(f"/api/projects/{data['id']}")
    assert script_res.status_code == 200
    script_data = script_res.json()
    assert "The Mystery of the Cast Voice" in script_data["raw_text"]
