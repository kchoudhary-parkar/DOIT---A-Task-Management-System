"""
Document Intelligence Backend
==============================
FastAPI service that integrates:
  - Docling  → parse PDFs, PPTX, DOCX, web URLs into structured text
  - OpenAI GPT-5 → extract KPIs, insights, recommendations
  - ReportLab → export branded PDF insight report

Install:
  pip install fastapi uvicorn python-multipart docling openai reportlab

Run:
  uvicorn document_intelligence_backend:app --reload --port 8000
"""

from __future__ import annotations

import io
import json
import os
import tempfile
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Annotated

import openai
import uvicorn
from docling.document_converter import DocumentConverter
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── ReportLab imports ──────────────────────────────────────────────────────
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="Document Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.environ.get("OPENAI_API_KEY", "sk-...")


# ── Pydantic models ────────────────────────────────────────────────────────
class KPI(BaseModel):
    label: str
    value: str
    trend: str  # "up" | "down" | "neutral"
    score: int  # 0-100


class Insight(BaseModel):
    category: str  # "Strategic" | "Financial" | "Market" | "Operational"
    priority: str  # "HIGH" | "MEDIUM" | "LOW"
    title: str
    body: str


class InsightReport(BaseModel):
    doc_name: str
    question: str
    summary: str
    kpis: list[KPI]
    insights: list[Insight]
    recommendations: list[str]
    generated_at: str


# ── Document parsing via Docling ──────────────────────────────────────────
def parse_document(source: str | Path) -> str:
    """
    Use Docling to convert a local file path or a URL to markdown text.
    Docling handles: PDF, PPTX, DOCX, HTML/URL, images, etc.
    """
    converter = DocumentConverter()
    result = converter.convert(str(source))
    return result.document.export_to_markdown()


# ── GPT-5 insight extraction ──────────────────────────────────────────────
SYSTEM_PROMPT = """You are an elite business intelligence analyst.
Given the text extracted from a document and an optional business question,
you must return a JSON object with EXACTLY this structure (no extra keys):

{
  "summary": "<2-3 sentence executive summary>",
  "kpis": [
    {"label": "<metric name>", "value": "<formatted value>", "trend": "up|down|neutral", "score": <0-100>}
  ],
  "insights": [
    {
      "category": "Strategic|Financial|Market|Operational",
      "priority": "HIGH|MEDIUM|LOW",
      "title": "<concise title>",
      "body": "<2-3 sentences with specifics>"
    }
  ],
  "recommendations": ["<actionable recommendation>"]
}

Guidelines:
- Extract 4-6 KPIs with real numbers from the document when available.
- Generate 4-6 insight cards covering different business dimensions.
- Provide 4-5 concrete, time-bound recommendations.
- Be specific—use numbers and percentages found in the document.
- Return ONLY valid JSON, no markdown fences, no preamble.
"""


def extract_insights_gpt5(doc_text: str, question: str) -> dict:
    user_prompt = f"""Business question: {question or "Provide a comprehensive business analysis."}

Document content:
{doc_text[:12000]}  # Truncate to fit context
"""
    response = openai.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=2500,
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


# ── ReportLab PDF builder ─────────────────────────────────────────────────

# Brand colours
C_BG = colors.HexColor("#0f1117")
C_SURFACE = colors.HexColor("#1a1d27")
C_ACCENT = colors.HexColor("#4f8ef7")
C_SUCCESS = colors.HexColor("#22c55e")
C_WARNING = colors.HexColor("#f59e0b")
C_DANGER = colors.HexColor("#ef4444")
C_TEXT = colors.HexColor("#e2e8f0")
C_MUTED = colors.HexColor("#64748b")
C_WHITE = colors.white


def build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            textColor=C_WHITE,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            textColor=C_MUTED,
            alignment=TA_LEFT,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=C_ACCENT,
            spaceBefore=6,
            spaceAfter=4,
            letterSpacing=1,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=C_TEXT,
        ),
        "kpi_value": ParagraphStyle(
            "KPIValue",
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=C_WHITE,
            alignment=TA_CENTER,
        ),
        "kpi_label": ParagraphStyle(
            "KPILabel",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=C_MUTED,
            alignment=TA_CENTER,
        ),
        "insight_title": ParagraphStyle(
            "InsightTitle",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=C_WHITE,
        ),
        "insight_body": ParagraphStyle(
            "InsightBody",
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=C_TEXT,
            spaceAfter=4,
        ),
        "tag": ParagraphStyle(
            "Tag",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=C_ACCENT,
        ),
        "rec": ParagraphStyle(
            "Rec",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=C_TEXT,
            leftIndent=12,
        ),
        "footer": ParagraphStyle(
            "Footer",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=C_MUTED,
            alignment=TA_CENTER,
        ),
    }


def draw_dark_background(canvas, doc):
    """Page background + header stripe callback."""
    canvas.saveState()
    w, h = A4

    # Dark background
    canvas.setFillColor(C_BG)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Top accent stripe
    canvas.setFillColor(C_ACCENT)
    canvas.rect(0, h - 3 * mm, w, 3 * mm, fill=1, stroke=0)

    # Bottom footer line
    canvas.setStrokeColor(C_MUTED)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 15 * mm, w - 20 * mm, 15 * mm)

    # Page number
    canvas.setFillColor(C_MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(w / 2, 10 * mm, f"Page {doc.page}")

    canvas.restoreState()


def generate_pdf_report(report: InsightReport) -> bytes:
    """Generate a dark-branded business insight PDF using ReportLab Platypus."""
    buffer = io.BytesIO()
    st = build_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=22 * mm,
    )

    story = []
    W = A4[0] - 40 * mm  # usable width

    # ── Cover / Title block ────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("DOCUMENT INTELLIGENCE REPORT", st["subtitle"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(report.doc_name, st["title"]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"Generated: {report.generated_at}", st["subtitle"]))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width=W, thickness=1, color=C_ACCENT, spaceAfter=6 * mm))

    # ── Executive Summary ─────────────────────────────────────────────────
    story.append(Paragraph("EXECUTIVE SUMMARY", st["section"]))
    story.append(Spacer(1, 2 * mm))

    # Dark card for summary
    summary_data = [[Paragraph(report.summary, st["body"])]]
    summary_table = Table(summary_data, colWidths=[W])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE),
                ("ROUNDEDCORNERS", [8]),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 6 * mm))

    # ── KPIs grid ─────────────────────────────────────────────────────────
    story.append(Paragraph("KEY PERFORMANCE INDICATORS", st["section"]))
    story.append(Spacer(1, 2 * mm))

    kpi_cells = []
    row = []
    col_w = W / 4 - 2 * mm
    for i, kpi in enumerate(report.kpis[:8]):
        trend_char = "▲" if kpi.trend == "up" else "▼" if kpi.trend == "down" else "▶"
        trend_color = (
            "22c55e"
            if kpi.trend == "up"
            else "ef4444"
            if kpi.trend == "down"
            else "64748b"
        )
        cell = [
            Paragraph(kpi.value, st["kpi_value"]),
            Spacer(1, 1 * mm),
            Paragraph(kpi.label.upper(), st["kpi_label"]),
            Spacer(1, 1 * mm),
            Paragraph(
                f'<font color="#{trend_color}">{trend_char} {kpi.score}/100</font>',
                st["kpi_label"],
            ),
        ]
        row.append(cell)
        if len(row) == 4 or i == len(report.kpis) - 1:
            # Pad row to 4 columns
            while len(row) < 4:
                row.append([""])
            kpi_cells.append(row)
            row = []

    if kpi_cells:
        kpi_table = Table(kpi_cells, colWidths=[col_w] * 4, rowHeights=None)
        kpi_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE),
                    ("GRID", (0, 0), (-1, -1), 0.5, C_BG),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(kpi_table)
    story.append(Spacer(1, 6 * mm))

    # ── Insights ──────────────────────────────────────────────────────────
    story.append(Paragraph("BUSINESS INSIGHTS", st["section"]))
    story.append(Spacer(1, 2 * mm))

    for ins in report.insights:
        priority_color = (
            "#ef4444"
            if ins.priority == "HIGH"
            else "#f59e0b"
            if ins.priority == "MEDIUM"
            else "#64748b"
        )
        header_text = (
            f'<font color="{priority_color}">● {ins.priority}</font>'
            f'  <font color="#4f8ef7">{ins.category.upper()}</font>'
        )
        cell_content = [
            Paragraph(header_text, st["tag"]),
            Spacer(1, 2 * mm),
            Paragraph(ins.title, st["insight_title"]),
            Spacer(1, 2 * mm),
            Paragraph(ins.body, st["insight_body"]),
        ]

        insight_table = Table([[cell_content]], colWidths=[W])
        insight_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    # Accent left border approximated with a colored strip column
                ]
            )
        )
        story.append(insight_table)
        story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 4 * mm))

    # ── Recommendations ───────────────────────────────────────────────────
    story.append(Paragraph("STRATEGIC RECOMMENDATIONS", st["section"]))
    story.append(Spacer(1, 2 * mm))

    rec_rows = []
    for i, rec in enumerate(report.recommendations, 1):
        num_cell = Paragraph(
            f'<font color="#4f8ef7"><b>{i}</b></font>',
            ParagraphStyle(
                "Num",
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=14,
                textColor=C_ACCENT,
                alignment=TA_CENTER,
            ),
        )
        rec_cell = Paragraph(rec, st["rec"])
        rec_rows.append([num_cell, rec_cell])

    if rec_rows:
        rec_table = Table(rec_rows, colWidths=[12 * mm, W - 12 * mm])
        rec_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.5, C_BG),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("LEFTPADDING", (0, 0), (0, -1), 10),
                    ("LEFTPADDING", (1, 0), (1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(rec_table)

    # ── Footer ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width=W, thickness=0.5, color=C_MUTED))
    story.append(Spacer(1, 2 * mm))
    story.append(
        Paragraph(
            "Powered by Docling · GPT-5 · ReportLab  |  Document Intelligence Platform",
            st["footer"],
        )
    )

    # Build
    doc.build(
        story,
        onFirstPage=draw_dark_background,
        onLaterPages=draw_dark_background,
    )
    buffer.seek(0)
    return buffer.getvalue()


# ── API Endpoints ─────────────────────────────────────────────────────────


@app.post("/api/analyze", response_model=InsightReport)
async def analyze_document(
    file: Annotated[UploadFile | None, File()] = None,
    url: Annotated[str, Form()] = "",
    question: Annotated[str, Form()] = "",
):
    """
    Accepts a file upload OR a URL.
    Returns structured insight JSON.
    """
    if not file and not url.strip():
        raise HTTPException(400, "Provide either a file or a URL.")

    # 1. Parse document with Docling
    if file:
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        try:
            doc_text = parse_document(tmp_path)
        finally:
            os.unlink(tmp_path)
        doc_name = file.filename
    else:
        doc_text = parse_document(url.strip())
        doc_name = url.strip()

    # 2. Extract insights via GPT-5
    raw = extract_insights_gpt5(doc_text, question)

    # 3. Build structured response
    report = InsightReport(
        doc_name=doc_name,
        question=question or "Comprehensive business analysis",
        summary=raw.get("summary", ""),
        kpis=[KPI(**k) for k in raw.get("kpis", [])],
        insights=[Insight(**i) for i in raw.get("insights", [])],
        recommendations=raw.get("recommendations", []),
        generated_at=datetime.now().strftime("%B %d, %Y %H:%M"),
    )
    return report


@app.post("/api/export-insights")
async def export_insights(report: InsightReport):
    """
    Accepts the insight JSON and returns a styled PDF binary.
    """
    pdf_bytes = generate_pdf_report(report)
    filename = f"insights_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "document_intelligence_backend:app", host="0.0.0.0", port=8000, reload=True
    )
