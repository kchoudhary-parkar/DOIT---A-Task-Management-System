from __future__ import annotations

import contextlib
import json
import mimetypes
import os
import smtplib
import sys
import tempfile
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# Ensure backend root is importable when launched via stdio subprocess.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(override=True)

with contextlib.redirect_stdout(sys.stderr):
    from database import db
    from models.user import User

mcp = FastMCP("doit-email-server")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DONE_STATUSES = {"done", "closed"}
IN_PROGRESS_STATUSES = {"in progress", "in-progress", "doing"}
ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".xlsx",
    ".xls",
    ".ppt",
    ".pptx",
    ".png",
    ".jpg",
    ".jpeg",
}
MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024
MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024


# ===========================================================================
# PDF Report Generator
# ===========================================================================


def _generate_status_pdf(report: Dict[str, Any]) -> Path:
    """
    Render a professional A4 PDF from a status-report dict.
    Returns the path to a NamedTemporaryFile — caller must delete it.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
        KeepTogether,
    )

    # ── Brand palette ───────────────────────────────────────────────────────
    BRAND_DARK = colors.HexColor("#1A1A2E")
    BRAND_ACCENT = colors.HexColor("#4F8EF7")
    BRAND_LIGHT = colors.HexColor("#E8F0FE")
    BRAND_GREEN = colors.HexColor("#27AE60")
    BRAND_ORANGE = colors.HexColor("#F39C12")
    BRAND_RED = colors.HexColor("#E74C3C")
    GREY_TEXT = colors.HexColor("#555555")
    GREY_BORDER = colors.HexColor("#DDDDDD")
    ROW_ALT = colors.HexColor("#F4F6FB")
    BG_STATS = colors.HexColor("#F8F9FA")
    WHITE = colors.white

    W, _H = A4
    MARGIN = 18 * mm
    INNER = W - 2 * MARGIN

    # ── Style factory ───────────────────────────────────────────────────────
    base = getSampleStyleSheet()

    def S(name: str, parent: str = "Normal", **kw) -> ParagraphStyle:
        return ParagraphStyle(name, parent=base[parent], **kw)

    S_TITLE = S("S_TITLE", "Title", fontSize=26, textColor=WHITE, leading=32)
    S_SUBTITLE = S("S_SUB", "Normal", fontSize=10, textColor=BRAND_LIGHT, leading=15)
    S_H1 = S(
        "S_H1",
        "Heading1",
        fontSize=13,
        textColor=BRAND_DARK,
        leading=18,
        spaceBefore=10,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    S_METRIC = S(
        "S_MET",
        "Normal",
        fontSize=22,
        textColor=BRAND_DARK,
        leading=26,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    S_MET_LBL = S(
        "S_METL",
        "Normal",
        fontSize=8,
        textColor=GREY_TEXT,
        leading=11,
        fontName="Helvetica",
        alignment=TA_CENTER,
    )
    S_BODY = S(
        "S_BODY",
        "Normal",
        fontSize=9,
        textColor=GREY_TEXT,
        leading=14,
        alignment=TA_CENTER,
    )
    S_LABEL = S(
        "S_LABEL",
        "Normal",
        fontSize=8,
        textColor=GREY_TEXT,
        leading=12,
        fontName="Helvetica",
    )
    S_TH = S(
        "S_TH",
        "Normal",
        fontSize=8,
        textColor=WHITE,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    S_TD = S("S_TD", "Normal", fontSize=8, textColor=BRAND_DARK, leading=12)
    S_TD_C = S(
        "S_TDC",
        "Normal",
        fontSize=8,
        textColor=BRAND_DARK,
        leading=12,
        alignment=TA_CENTER,
    )
    S_TAG_G = S(
        "S_TAGG",
        "Normal",
        fontSize=8,
        textColor=BRAND_GREEN,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    S_TAG_O = S(
        "S_TAGO",
        "Normal",
        fontSize=8,
        textColor=BRAND_ORANGE,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    S_TAG_R = S(
        "S_TAGR",
        "Normal",
        fontSize=8,
        textColor=BRAND_RED,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )

    # ── Widget helpers ──────────────────────────────────────────────────────

    def _status_badge(status: Any) -> Paragraph:
        s = str(status or "").strip().lower()
        if s in DONE_STATUSES:
            return Paragraph("&#9679; DONE", S_TAG_G)
        if s in IN_PROGRESS_STATUSES:
            return Paragraph("&#9679; IN PROGRESS", S_TAG_O)
        return Paragraph("&#9675; OPEN", S_TAG_R)

    def _priority_badge(priority: Any) -> Paragraph:
        p = str(priority or "").strip().lower()
        if p == "high":
            return Paragraph("&#9650; HIGH", S_TAG_R)
        if p == "medium":
            return Paragraph("&#9679; MED", S_TAG_O)
        return Paragraph("&#9660; LOW", S_TAG_G)

    def _progress_bar(pct: float, width: float = 62 * mm, height: int = 5) -> Table:
        pct = max(0.0, min(float(pct), 100.0))
        filled = (pct / 100) * width
        color = BRAND_GREEN if pct >= 75 else (BRAND_ORANGE if pct >= 40 else BRAND_RED)
        bar = Table([["", ""]], colWidths=[filled, width - filled], rowHeights=[height])
        bar.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), color),
                    ("BACKGROUND", (1, 0), (1, 0), GREY_BORDER),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return bar

    # ── Section builders ────────────────────────────────────────────────────

    def _build_header(story: list, generated_at: str) -> None:
        banner = Table(
            [
                [
                    Paragraph("DOIT", S_TITLE),
                    Paragraph(
                        f"Project Status Report<br/>"
                        f"<font size='9'>{generated_at}</font>",
                        S_SUBTITLE,
                    ),
                ]
            ],
            colWidths=[INNER - 110 * mm, 110 * mm],
        )
        banner.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 14),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ]
            )
        )
        story.append(banner)
        story.append(Spacer(1, 6 * mm))

    def _build_kpi_row(story: list, overall: Dict[str, Any]) -> None:
        metrics = [
            (str(overall.get("project_count", 0)), "Projects"),
            (str(overall.get("task_count", 0)), "Total Tasks"),
            (str(overall.get("open_tasks", 0)), "Open"),
            (str(overall.get("in_progress_tasks", 0)), "In Progress"),
            (str(overall.get("done_tasks", 0)), "Done"),
            (str(overall.get("overdue_tasks", 0)), "Overdue"),
            (f"{overall.get('average_completion_pct', 0.0)}%", "Avg Completion"),
        ]
        n = len(metrics)
        cw = INNER / n
        tbl = Table(
            [
                [Paragraph(v, S_METRIC) for v, _ in metrics],
                [Paragraph(l, S_MET_LBL) for _, l in metrics],
            ],
            colWidths=[cw] * n,
        )
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT),
                    ("BOX", (0, 0), (-1, -1), 0.5, GREY_BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, GREY_BORDER),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]
            )
        )
        story.append(KeepTogether([tbl]))
        story.append(Spacer(1, 6 * mm))

    def _build_project_block(story: list, project: Dict[str, Any]) -> None:
        pct = float(project.get("completion_pct", 0.0))
        name = project.get("project_name", "Untitled")
        color = BRAND_GREEN if pct >= 75 else (BRAND_ORANGE if pct >= 40 else BRAND_RED)

        # Header banner
        hdr = Table(
            [
                [
                    Paragraph(
                        name,
                        S(
                            "_PH",
                            "Normal",
                            fontSize=11,
                            textColor=WHITE,
                            fontName="Helvetica-Bold",
                        ),
                    ),
                    Paragraph(
                        f"{pct:.1f}% complete",
                        S(
                            "_PC",
                            "Normal",
                            fontSize=9,
                            textColor=WHITE,
                            alignment=TA_RIGHT,
                        ),
                    ),
                ]
            ],
            colWidths=[INNER - 52 * mm, 52 * mm],
        )
        hdr.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), color),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        # Stats mini-row
        stats = [
            ("Total", project.get("total_tasks", 0)),
            ("Open", project.get("open_tasks", 0)),
            ("In Progress", project.get("in_progress_tasks", 0)),
            ("Done", project.get("done_tasks", 0)),
            ("Overdue", project.get("overdue_tasks", 0)),
            ("High Priority", project.get("high_priority_tasks", 0)),
            ("Unassigned", project.get("unassigned_tasks", 0)),
        ]
        n = len(stats)
        cw = INNER / n
        stat_tbl = Table(
            [
                [
                    Paragraph(
                        f"<b>{v}</b><br/><font size='7' color='grey'>{k}</font>", S_BODY
                    )
                    for k, v in stats
                ]
            ],
            colWidths=[cw] * n,
        )
        stat_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BG_STATS),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, GREY_BORDER),
                    ("BOX", (0, 0), (-1, -1), 0.3, GREY_BORDER),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )

        # Progress bar row
        pb_tbl = Table(
            [
                [
                    Paragraph("Completion", S_LABEL),
                    _progress_bar(pct),
                    Paragraph(f"  {pct:.1f}%", S_LABEL),
                ]
            ],
            colWidths=[28 * mm, 64 * mm, 16 * mm],
        )
        pb_tbl.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("BACKGROUND", (0, 0), (-1, -1), BG_STATS),
                    ("BOX", (0, 0), (-1, -1), 0.3, GREY_BORDER),
                ]
            )
        )

        elements: list = [hdr, stat_tbl, pb_tbl]

        # Sample tasks table
        samples = project.get("sample_tasks", [])
        if samples:
            col_ws = [18 * mm, 62 * mm, 26 * mm, 18 * mm, 32 * mm, 22 * mm]
            rows = [
                [
                    Paragraph(h, S_TH)
                    for h in [
                        "Ticket",
                        "Title",
                        "Status",
                        "Priority",
                        "Assignee",
                        "Due Date",
                    ]
                ]
            ]
            for task in samples:
                due = str(task.get("due_date") or "—")[:10]
                rows.append(
                    [
                        Paragraph(str(task.get("ticket_id") or "—"), S_TD_C),
                        Paragraph(str(task.get("title") or "—")[:55], S_TD),
                        _status_badge(task.get("status")),
                        _priority_badge(task.get("priority")),
                        Paragraph(
                            str(task.get("assignee_name") or "Unassigned")[:25], S_TD
                        ),
                        Paragraph(due, S_TD_C),
                    ]
                )
            task_tbl = Table(rows, colWidths=col_ws, repeatRows=1)
            task_tbl.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
                        ("GRID", (0, 0), (-1, -1), 0.3, GREY_BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            elements.append(task_tbl)

        elements.append(Spacer(1, 5 * mm))
        story.append(KeepTogether(elements))

    # ── Page footer ─────────────────────────────────────────────────────────

    def _page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(GREY_TEXT)
        y = 10 * mm
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        canvas.drawCentredString(
            W / 2,
            y,
            f"DOIT — Confidential   |   Page {doc.page}   |   Generated {ts}",
        )
        canvas.setStrokeColor(GREY_BORDER)
        canvas.line(MARGIN, y + 5, W - MARGIN, y + 5)
        canvas.restoreState()

    # ── Assemble ─────────────────────────────────────────────────────────────

    tmp = tempfile.NamedTemporaryFile(
        suffix=".pdf", prefix="doit_status_", delete=False
    )
    tmp.close()
    out_path = Path(tmp.name)

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=20 * mm,
        title="DOIT Status Report",
        author="DOIT AI Agent",
    )

    generated_at = (
        report.get("generated_at", datetime.now(timezone.utc).isoformat())[:19].replace(
            "T", " "
        )
        + " UTC"
    )
    story: list = []
    _build_header(story, generated_at)
    _build_kpi_row(story, report.get("overall", {}))
    story.append(Paragraph("Project Breakdown", S_H1))
    story.append(
        HRFlowable(width="100%", thickness=1, color=BRAND_ACCENT, spaceAfter=4)
    )
    for project in sorted(
        report.get("projects", []), key=lambda p: p.get("project_name", "").lower()
    ):
        _build_project_block(story, project)

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return out_path


# ===========================================================================
# Domain helpers
# ===========================================================================


def _is_super_admin(user_id: str) -> bool:
    try:
        user = User.find_by_id(user_id)
        return bool(user and user.get("role", "").lower() == "super-admin")
    except Exception:
        return False


def _project_access_filter(user_id: str) -> Dict[str, Any]:
    if _is_super_admin(user_id):
        return {}
    return {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _parse_due_date(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    value_str = str(value).strip()
    if not value_str:
        return None
    candidates = [value_str]
    if value_str.endswith("Z"):
        candidates.append(value_str.replace("Z", "+00:00"))
    for candidate in candidates:
        try:
            return datetime.fromisoformat(candidate)
        except Exception:
            continue
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value_str, fmt)
        except Exception:
            continue
    return None


def _normalize_status(status: Any) -> str:
    return str(status or "").strip().lower()


# ===========================================================================
# Status report builder
# ===========================================================================


def _build_status_report(
    requesting_user_id: str,
    project_name: Optional[str] = None,
    include_task_samples: bool = True,
    max_tasks_per_project: int = 5,
) -> Dict[str, Any]:
    project_query: Dict[str, Any] = _project_access_filter(requesting_user_id)
    if project_name:
        project_query["name"] = {"$regex": f"^{project_name}$", "$options": "i"}

    projects = list(db.projects.find(project_query).sort("created_at", -1))
    if not projects:
        return {
            "success": False,
            "error": "No accessible projects found for this user.",
        }

    project_ids = [str(p["_id"]) for p in projects]
    tasks = list(db.tasks.find({"project_id": {"$in": project_ids}}))

    project_stats: Dict[str, Dict[str, Any]] = {}
    for project in projects:
        pid = str(project["_id"])
        project_stats[pid] = {
            "project_id": pid,
            "project_name": project.get("name", "Untitled Project"),
            "description": project.get("description", ""),
            "total_tasks": 0,
            "open_tasks": 0,
            "in_progress_tasks": 0,
            "done_tasks": 0,
            "overdue_tasks": 0,
            "high_priority_tasks": 0,
            "unassigned_tasks": 0,
            "completion_pct": 0.0,
            "sample_tasks": [],
        }

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for task in tasks:
        pid = str(task.get("project_id", ""))
        if pid not in project_stats:
            continue
        stats = project_stats[pid]
        stats["total_tasks"] += 1
        status = _normalize_status(task.get("status"))
        priority = str(task.get("priority", "")).strip().lower()

        if status in DONE_STATUSES:
            stats["done_tasks"] += 1
        elif status in IN_PROGRESS_STATUSES:
            stats["in_progress_tasks"] += 1
            stats["open_tasks"] += 1
        else:
            stats["open_tasks"] += 1

        if priority in {"high", "critical"}:
            stats["high_priority_tasks"] += 1
        if (
            not str(task.get("assignee_email", "")).strip()
            and not str(task.get("assignee_name", "")).strip()
        ):
            stats["unassigned_tasks"] += 1

        due_date = _parse_due_date(task.get("due_date"))
        if due_date and due_date < now and status not in DONE_STATUSES:
            stats["overdue_tasks"] += 1

        if include_task_samples and len(stats["sample_tasks"]) < max_tasks_per_project:
            stats["sample_tasks"].append(
                {
                    "ticket_id": task.get("ticket_id"),
                    "title": task.get("title"),
                    "status": task.get("status"),
                    "priority": task.get("priority"),
                    "assignee_name": task.get("assignee_name") or "Unassigned",
                    "due_date": task.get("due_date"),
                }
            )

    overall = {
        "project_count": len(projects),
        "task_count": 0,
        "open_tasks": 0,
        "in_progress_tasks": 0,
        "done_tasks": 0,
        "overdue_tasks": 0,
        "high_priority_tasks": 0,
        "unassigned_tasks": 0,
        "average_completion_pct": 0.0,
    }
    report_projects = []
    for project in project_stats.values():
        total = int(project["total_tasks"])
        done = int(project["done_tasks"])
        project["completion_pct"] = round((done / total) * 100, 2) if total else 0.0
        report_projects.append(project)
        overall["task_count"] += total
        overall["open_tasks"] += int(project["open_tasks"])
        overall["in_progress_tasks"] += int(project["in_progress_tasks"])
        overall["done_tasks"] += done
        overall["overdue_tasks"] += int(project["overdue_tasks"])
        overall["high_priority_tasks"] += int(project["high_priority_tasks"])
        overall["unassigned_tasks"] += int(project["unassigned_tasks"])

    if report_projects:
        overall["average_completion_pct"] = round(
            sum(_safe_float(p["completion_pct"]) for p in report_projects)
            / len(report_projects),
            2,
        )

    lines = [
        "DOIT Status Summary",
        f"Generated: {datetime.now(timezone.utc).isoformat()}Z",
        "",
        "Overall:",
        f"- Projects:       {overall['project_count']}",
        f"- Tasks:          {overall['task_count']}",
        f"- Open:           {overall['open_tasks']}",
        f"- In Progress:    {overall['in_progress_tasks']}",
        f"- Done/Closed:    {overall['done_tasks']}",
        f"- Overdue:        {overall['overdue_tasks']}",
        f"- High Priority:  {overall['high_priority_tasks']}",
        f"- Unassigned:     {overall['unassigned_tasks']}",
        f"- Avg Completion: {overall['average_completion_pct']}%",
        "",
        "Project Breakdown:",
    ]
    for p in sorted(report_projects, key=lambda x: x["project_name"].lower()):
        lines.append(
            f"- {p['project_name']}: total={p['total_tasks']}, "
            f"open={p['open_tasks']}, in_progress={p['in_progress_tasks']}, "
            f"done={p['done_tasks']}, overdue={p['overdue_tasks']}, "
            f"completion={p['completion_pct']}%"
        )

    summary_text = "\n".join(lines)
    return {
        "success": True,
        "generated_at": datetime.now(timezone.utc).isoformat() + "Z",
        "overall": overall,
        "projects": report_projects,
        "summary_text": summary_text
        if summary_text.strip()
        else "No project data available.",
    }


# ===========================================================================
# SMTP helpers
# ===========================================================================


def _get_smtp_settings() -> Dict[str, Any]:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    username = (os.getenv("SMTP_USERNAME") or os.getenv("GMAIL_ADDRESS") or "").strip()
    password = (
        os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD") or ""
    ).strip()
    from_email = (os.getenv("SMTP_FROM_EMAIL") or username).strip()
    from_name = os.getenv("SMTP_FROM_NAME", "DOIT AI Agent").strip()

    smtp_port_env = os.getenv("SMTP_PORT", "").strip()
    port_explicitly_set = bool(smtp_port_env)

    if not port_explicitly_set and host.lower() == "smtp.gmail.com":
        # Gmail default: SSL on port 465 (most reliable for App Passwords)
        port, use_ssl, use_tls = 465, True, False
    else:
        port = int(smtp_port_env) if smtp_port_env else 587
        use_ssl_env = os.getenv("SMTP_USE_SSL", "").strip().lower()
        use_tls_env = os.getenv("SMTP_USE_TLS", "").strip().lower()
        if port == 465:
            use_ssl, use_tls = True, False
        elif port == 587:
            use_ssl, use_tls = False, True
        else:
            use_ssl = use_ssl_env in {"1", "true", "yes", "y"}
            use_tls = (
                (use_tls_env in {"1", "true", "yes", "y"}) if not use_ssl else False
            )

    return dict(
        host=host,
        port=port,
        username=username,
        password=password,
        from_email=from_email,
        from_name=from_name,
        use_tls=use_tls,
        use_ssl=use_ssl,
    )


def _as_email_list(value: Optional[List[str] | str]) -> List[str]:
    if value is None:
        return []
    raw = value.split(",") if isinstance(value, str) else list(value)
    return [str(e).strip() for e in raw if str(e).strip()]


def _resolve_attachments(
    attachment_paths: Optional[List[str]],
) -> tuple[List[Path], int]:
    if not attachment_paths:
        return [], 0
    resolved: List[Path] = []
    total_size = 0
    for raw in attachment_paths:
        if not raw or not str(raw).strip():
            continue
        candidate = Path(str(raw).strip())
        candidate = (
            (ROOT_DIR / candidate).resolve()
            if not candidate.is_absolute()
            else candidate.resolve()
        )
        if not candidate.exists() or not candidate.is_file():
            raise ValueError(f"Attachment not found: {raw}")
        ext = candidate.suffix.lower()
        if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise ValueError(
                f"Unsupported attachment type '{candidate.name}'. "
                f"Allowed: {sorted(ALLOWED_ATTACHMENT_EXTENSIONS)}"
            )
        size = candidate.stat().st_size
        if size > MAX_ATTACHMENT_SIZE_BYTES:
            raise ValueError(
                f"Attachment '{candidate.name}' exceeds "
                f"{MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)} MB limit."
            )
        total_size += size
        if total_size > MAX_TOTAL_ATTACHMENT_SIZE_BYTES:
            raise ValueError(
                f"Total attachments exceed "
                f"{MAX_TOTAL_ATTACHMENT_SIZE_BYTES // (1024 * 1024)} MB limit."
            )
        resolved.append(candidate)
    return resolved, total_size


def _build_email_message(
    settings: Dict[str, Any],
    to_list: List[str],
    cc_list: List[str],
    subject: str,
    body: str,
    attachments: List[Path],
) -> EmailMessage:
    import html as html_module
    import re

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings['from_name']} <{settings['from_email']}>"
    msg["To"] = ", ".join(to_list)
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)

    is_html = body.lstrip().startswith("<")
    if is_html:
        plain = html_module.unescape(re.sub(r"<[^>]+>", "", body)).strip() or body
        msg.set_content(plain)
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    for att in attachments:
        mime_type, _ = mimetypes.guess_type(str(att))
        maintype, subtype = ("application", "octet-stream")
        if mime_type:
            parts = mime_type.split("/", 1)
            if len(parts) == 2:
                maintype, subtype = parts
        with open(att, "rb") as fh:
            msg.add_attachment(
                fh.read(), maintype=maintype, subtype=subtype, filename=att.name
            )

    return msg


def _smtp_send(
    settings: Dict[str, Any], msg: EmailMessage, recipients: List[str]
) -> None:
    host, port = settings["host"], settings["port"]
    username, password, from_email = (
        settings["username"],
        settings["password"],
        settings["from_email"],
    )

    def _do(server: smtplib.SMTP | smtplib.SMTP_SSL) -> None:
        server.login(username, password)
        server.send_message(msg, from_addr=from_email, to_addrs=recipients)

    if settings["use_ssl"]:
        with smtplib.SMTP_SSL(host, port, timeout=30) as s:
            _do(s)
    else:
        with smtplib.SMTP(host, port, timeout=30) as s:
            if settings["use_tls"]:
                s.ehlo()
                s.starttls()
                s.ehlo()
            _do(s)


def _send_email(
    to_emails: List[str],
    subject: str,
    body: str,
    attachment_paths: Optional[List[str]] = None,
    cc_emails: Optional[List[str]] = None,
    bcc_emails: Optional[List[str]] = None,
) -> Dict[str, Any]:
    settings = _get_smtp_settings()
    missing = [
        k
        for k in ["host", "port", "username", "password", "from_email"]
        if not settings.get(k)
    ]
    if missing:
        return {
            "success": False,
            "error": (
                "SMTP not configured. Missing: "
                + ", ".join(missing)
                + ". Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME/SMTP_PASSWORD "
                "(or GMAIL_ADDRESS/GMAIL_APP_PASSWORD)."
            ),
        }

    to_list = _as_email_list(to_emails)
    cc_list = _as_email_list(cc_emails)
    bcc_list = _as_email_list(bcc_emails)
    if not to_list:
        return {"success": False, "error": "At least one recipient email is required."}

    try:
        attachments, total_size = _resolve_attachments(attachment_paths)
    except ValueError as exc:
        return {"success": False, "error": str(exc)}

    msg = _build_email_message(settings, to_list, cc_list, subject, body, attachments)
    all_recipients = to_list + cc_list + bcc_list
    primary_error: Optional[str] = None

    try:
        _smtp_send(settings, msg, all_recipients)
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "error": (
                "SMTP authentication failed. For Gmail, generate an App Password at "
                "https://myaccount.google.com/apppasswords and set GMAIL_APP_PASSWORD "
                "(2-Step Verification must be enabled)."
            ),
        }
    except (smtplib.SMTPException, OSError) as exc:
        primary_error = str(exc)
        fallback = dict(settings)
        if settings["use_ssl"]:
            fallback.update(use_ssl=False, use_tls=True, port=587)
        else:
            fallback.update(use_ssl=True, use_tls=False, port=465)
        try:
            _smtp_send(fallback, msg, all_recipients)
            settings = fallback
        except Exception as fb_exc:
            return {
                "success": False,
                "error": (
                    f"Primary ({'SSL' if settings['use_ssl'] else 'STARTTLS'} "
                    f"port {settings['port']}) failed: {primary_error}. "
                    f"Fallback (port {fallback['port']}) also failed: {fb_exc}"
                ),
            }
    except Exception as exc:
        return {"success": False, "error": str(exc)}

    return {
        "success": True,
        "message": "Email sent successfully.",
        "to": to_list,
        "cc": cc_list,
        "bcc_count": len(bcc_list),
        "subject": subject,
        "attachment_count": len(attachments),
        "total_attachment_size_bytes": total_size,
        "smtp_host": settings["host"],
        "smtp_port": settings["port"],
        "use_ssl": settings["use_ssl"],
    }


# ===========================================================================
# MCP tool endpoints
# ===========================================================================


@mcp.tool()
def generate_status_summary(
    requesting_user_id: str,
    project_name: Optional[str] = None,
    include_task_samples: bool = True,
    max_tasks_per_project: int = 5,
) -> str:
    """Generate overall project/task status summary for accessible projects."""
    try:
        payload = _build_status_report(
            requesting_user_id=requesting_user_id,
            project_name=project_name,
            include_task_samples=include_task_samples,
            max_tasks_per_project=max(1, min(max_tasks_per_project, 20)),
        )
        return json.dumps(payload, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


@mcp.tool()
def send_email_with_attachments(
    to_emails: List[str],
    subject: str,
    body: str,
    attachment_paths: Optional[List[str]] = None,
    cc_emails: Optional[List[str]] = None,
    bcc_emails: Optional[List[str]] = None,
) -> str:
    """Send email with optional PDF/document/image attachments via SMTP."""
    try:
        payload = _send_email(
            to_emails=to_emails,
            subject=subject,
            body=body,
            attachment_paths=attachment_paths,
            cc_emails=cc_emails,
            bcc_emails=bcc_emails,
        )
        return json.dumps(payload, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


@mcp.tool()
def send_status_summary_email(
    requesting_user_id: str,
    to_emails: List[str],
    subject: Optional[str] = None,
    project_name: Optional[str] = None,
    attachment_paths: Optional[List[str]] = None,
    include_task_samples: bool = True,
    max_tasks_per_project: int = 5,
    cc_emails: Optional[List[str]] = None,
    bcc_emails: Optional[List[str]] = None,
    attach_pdf: bool = True,
) -> str:
    """
    Generate a status report, render it as a professional A4 PDF, and email it.

    Parameters
    ----------
    attach_pdf : bool
        True (default) — auto-generate the PDF and attach it to the email.
        False — send the plain-text summary only.
    attachment_paths : list[str], optional
        Any additional files to attach alongside the PDF.
    """
    pdf_path: Optional[Path] = None
    try:
        report = _build_status_report(
            requesting_user_id=requesting_user_id,
            project_name=project_name,
            include_task_samples=include_task_samples,
            max_tasks_per_project=max(1, min(max_tasks_per_project, 20)),
        )
        if not report.get("success"):
            return json.dumps(report, default=str)

        email_subject = (
            subject
            or f"DOIT Status Report — "
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
        )

        body_text = report.get("summary_text", "").strip()
        if not body_text:
            body_text = json.dumps(report.get("overall", {}), indent=2)

        final_paths: List[str] = list(attachment_paths or [])
        pdf_info: Dict[str, Any] = {"pdf_generated": False}

        if attach_pdf:
            try:
                pdf_path = _generate_status_pdf(report)
                final_paths.insert(0, str(pdf_path))
                pdf_info = {
                    "pdf_generated": True,
                    "pdf_size_bytes": pdf_path.stat().st_size,
                }
            except Exception as pdf_exc:
                pdf_info = {"pdf_generated": False, "pdf_error": str(pdf_exc)}

        send_result = _send_email(
            to_emails=to_emails,
            subject=email_subject,
            body=body_text,
            attachment_paths=final_paths or None,
            cc_emails=cc_emails,
            bcc_emails=bcc_emails,
        )

        return json.dumps(
            {
                "success": bool(send_result.get("success")),
                "subject": email_subject,
                "email": send_result,
                "pdf": pdf_info,
                "summary": report,
            },
            default=str,
        )

    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})
    finally:
        # Always clean up temp PDF file
        if pdf_path and pdf_path.exists():
            try:
                pdf_path.unlink()
            except Exception:
                pass


if __name__ == "__main__":
    mcp.run(transport="stdio")
