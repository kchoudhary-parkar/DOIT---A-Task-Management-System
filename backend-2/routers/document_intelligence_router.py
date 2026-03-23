
"""
Document Intelligence Router
Base path: /api/document-intelligence

Endpoints:
  POST /analyze          - Upload file or pass URL → returns InsightReport JSON
  POST /export-pdf       - Accept InsightReport JSON → returns PDF binary
  GET  /health           - Service health check

Supported file types: PDF, PPTX, DOCX, TXT, CSV, XLSX, XLS
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from typing import Annotated, Optional
from pathlib import Path
import io

from document_intelligence import (
    InsightReport,
    analyze_document_from_file,
    analyze_document_from_url,
    get_document_intelligence_llm_config,
    generate_pdf_report,
)
from datetime import datetime

router = APIRouter(prefix="/api/document-intelligence", tags=["Document Intelligence"])

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".pptx",
    ".ppt",
    ".docx",
    ".doc",
    ".txt",
    ".csv",
    ".xlsx",
    ".xls",
}


@router.post("/analyze", response_model=InsightReport)
async def analyze_document(
    file: Annotated[Optional[UploadFile], File()] = None,
    url: Annotated[str, Form()] = "",
    question: Annotated[str, Form()] = "",
):
    """
    Accepts a file upload (PDF, PPTX, DOCX, TXT, CSV, XLSX, XLS) OR a URL.
    - CSV / Excel: parsed with pandas (stats + sample rows sent to AI)
    - PDF / PPTX / DOCX / TXT: parsed with Docling
    - URL: fetched and parsed with Docling
    Returns a structured InsightReport JSON.
    """
    if not file and not url.strip():
        raise HTTPException(400, "Provide either a file upload or a URL.")

    if file:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                400,
                f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

    try:
        if file:
            file_bytes = await file.read()
            return analyze_document_from_file(file_bytes, file.filename, question)
        else:
            return analyze_document_from_url(url.strip(), question)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export-pdf")
async def export_pdf(report: InsightReport):
    """
    Accept the InsightReport JSON (from /analyze) and return a
    dark-branded PDF binary built with ReportLab.
    """
    try:
        pdf_bytes = generate_pdf_report(report)
        filename = f"insights_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def health():
    cfg = get_document_intelligence_llm_config()
    return {
        "status": "ok",
        "service": "Document Intelligence",
        "supported_formats": sorted(ALLOWED_EXTENSIONS),
        "azure_key": "loaded" if cfg.get("key_loaded") else "missing",
        "azure_endpoint": cfg.get("endpoint"),
        "azure_deployment": cfg.get("deployment"),
        "azure_api_version": cfg.get("api_version"),
    }
