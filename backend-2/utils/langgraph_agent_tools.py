# # LangChain tool: Send any message to a Slack channel using bot token
# from langchain_core.tools import tool

# @tool
# def send_slack_message_to_channel_tool(
#     bot_token: str,
#     channel_id: str,
#     message_text: str,
# ) -> str:
#     """
#     Send any message to a Slack channel using bot token and channel id.
#     Args:
#         bot_token: Slack bot token (xoxb-...)
#         channel_id: Slack channel ID (C...)
#         message_text: The message to send
#     Returns: Slack API response as string
#     """
#     import requests
#     url = "https://slack.com/api/chat.postMessage"
#     headers = {
#         "Authorization": f"Bearer {bot_token}",
#         "Content-Type": "application/json",
#     }
#     payload = {
#         "channel": channel_id,
#         "text": message_text,
#     }
#     res = requests.post(url, headers=headers, json=payload)
#     return res.text

# # Example usage in your agent code:
# # from utils.langgraph_agent_tools import send_slack_message_to_channel_tool
# # response = send_slack_message_to_channel_tool(
# #     bot_token="xoxb-...",
# #     channel_id="C12345678",
# #     message_text="Here is your project summary: ..."
# # )
# # print(response)
# # Utility: Send a test Slack message using bot token and channel id (for integration verification)
# def send_slack_test_message(bot_token: str, channel_id: str, channel_name: str) -> dict:
#     """
#     Send a test message to a Slack channel using bot token and channel id.
#     Returns the Slack API response as a dict.
#     """
#     import requests
#     url = "https://slack.com/api/chat.postMessage"
#     headers = {
#         "Authorization": f"Bearer {bot_token}",
#         "Content-Type": "application/json",
#     }
#     payload = {
#         "channel": channel_id,
#         "text": f"✅ Integration ready for #{channel_name}",
#     }
#     res = requests.post(url, headers=headers, json=payload)
#     return res.json()
import subprocess
import httpx

"""
LangGraph Agent Tools - FULL INTEGRATION
LangChain tool definitions for DOIT task management + Email automation
"""

import logging
import smtplib
import os

import mimetypes
import json
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from database import db
from bson import ObjectId
from datetime import datetime, timedelta
from utils.langgraph_agent_utils import get_llm
from utils.notification_utils import (
    send_discord_notification,
    send_teams_notification,
    # send_slack_notification,  # unused, remove
    send_whatsapp_notification,
)

logger = logging.getLogger(__name__)

# ─── Global context for tools (set per request) ───────────────────────────────
_tool_context = {}


def set_tool_context(user_id: str, user_email: str, user_role: str):
    """Set context that tools can access."""
    global _tool_context
    _tool_context = {
        "user_id": user_id,
        "user_email": user_email,
        "user_role": user_role,
    }


def get_tool_context():
    """Get current tool context."""
    return _tool_context


import requests


@tool
def send_slack_message_tool(
    text: str,
    project_name: Optional[str] = None,
) -> str:
    """
    Send a Slack message to a project's configured channel.

    Args:
        text: Message content to send
        project_name: Project name (optional but recommended)

    Returns:
        Success or error message

    Examples:
        send_slack_message_tool(
            text="🚀 Deployment completed",
            project_name="Website Redesign"
        )
    """
    try:
        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        if not user_id:
            return "❌ User context missing."

        # ── Resolve project ────────────────────────────────────────────────
        project = None

        if project_name:
            project = db.projects.find_one(
                {
                    "name": project_name,
                    "$or": [{"user_id": user_id}, {"members.user_id": user_id}],
                }
            )
        else:
            # fallback: latest project
            project = db.projects.find_one(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]},
                sort=[("created_at", -1)],
            )

        if not project:
            return f"❌ Project '{project_name}' not found or access denied."

        # ── Fetch Slack integration ────────────────────────────────────────
        integration = db.team_integrations.find_one(
            {"project_id": str(project["_id"]), "platform": "slack", "is_active": True}
        )

        if not integration:
            return "❌ Slack is not configured for this project."

        creds = integration.get("credentials", {})
        channel_id = creds.get("channel_id")
        token = creds.get("workspace_token")

        if not channel_id or not token:
            return "❌ Slack credentials incomplete."

        # ── Send message ───────────────────────────────────────────────────
        url = "https://slack.com/api/chat.postMessage"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        payload = {
            "channel": channel_id,
            "text": text,
        }

        res = requests.post(url, headers=headers, json=payload)
        data = res.json()

        if not data.get("ok"):
            return f"❌ Slack API error: {data.get('error')}"

        return f"✅ Message sent to Slack channel #{creds.get('channel_name')}"

    except Exception as e:
        logger.error(f"send_slack_message_tool error: {e}")
        import traceback

        traceback.print_exc()
        return f"❌ Failed to send Slack message: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL TOOL (SMTP — works directly, no OAuth needed)
# Set these in your .env:
#   GMAIL_ADDRESS=you@gmail.com
#   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  ← from myaccount.google.com → Security → App Passwords
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def send_email_tool(
    to: str,
    subject: str,
    body: str,
    cc: Optional[str] = None,
    bcc: Optional[str] = None,
    html_body: Optional[str] = None,
    attachment_paths: Optional[str] = None,
) -> str:
    """
    Send an email via Gmail SMTP. No OAuth needed — uses App Password from env.

    Args:
        to: Recipient email (or comma-separated list e.g. "a@x.com,b@x.com")
        subject: Email subject line
        body: Plain text email body
        cc: CC recipients, comma-separated (optional)
        bcc: BCC recipients, comma-separated (optional)
        html_body: HTML version of body for rich formatting (optional)
        attachment_paths: Comma-separated file paths to attach (optional)
                          e.g. "/tmp/report.pdf,/tmp/data.xlsx"

    Returns:
        Success or error message.

    Examples:
        send_email_tool(to="alice@example.com", subject="Hi", body="Hello!")
        send_email_tool(to="bob@example.com", subject="Report", body="See attached.", attachment_paths="/tmp/report.pdf")
        send_email_tool(to="team@co.com", subject="Update", body="Plain text", html_body="<b>Bold update</b>")
    """
    try:
        gmail_address = os.environ.get("GMAIL_ADDRESS")
        gmail_password = os.environ.get("GMAIL_APP_PASSWORD")

        if not gmail_address or not gmail_password:
            return (
                "❌ Email not configured. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD "
                "in your .env file. Generate an App Password at: "
                "myaccount.google.com → Security → App Passwords"
            )

        # ── Build message container ───────────────────────────────────────────
        msg = MIMEMultipart("mixed")
        msg["From"] = gmail_address
        msg["To"] = to
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc
        if bcc:
            msg["Bcc"] = bcc

        # ── Body (plain text or plain + HTML) ─────────────────────────────────
        if html_body:
            alternative = MIMEMultipart("alternative")
            alternative.attach(MIMEText(body, "plain"))
            alternative.attach(MIMEText(html_body, "html"))
            msg.attach(alternative)
        else:
            msg.attach(MIMEText(body, "plain"))

        # ── Attachments ───────────────────────────────────────────────────────
        attached_files = []
        skipped_files = []

        if attachment_paths:
            paths = [p.strip() for p in attachment_paths.split(",") if p.strip()]
            for file_path in paths:
                if not os.path.exists(file_path):
                    skipped_files.append(file_path)
                    logger.warning(f"Attachment not found, skipping: {file_path}")
                    continue

                mime_type, _ = mimetypes.guess_type(file_path)
                mime_type = mime_type or "application/octet-stream"
                main_type, sub_type = mime_type.split("/", 1)

                with open(file_path, "rb") as f:
                    part = MIMEBase(main_type, sub_type)
                    part.set_payload(f.read())

                encoders.encode_base64(part)
                filename = os.path.basename(file_path)
                part.add_header("Content-Disposition", "attachment", filename=filename)
                msg.attach(part)
                attached_files.append(filename)

        # ── Build full recipient list for SMTP (To + CC + BCC) ────────────────
        all_recipients = [r.strip() for r in to.split(",")]
        if cc:
            all_recipients += [r.strip() for r in cc.split(",")]
        if bcc:
            all_recipients += [r.strip() for r in bcc.split(",")]

        # ── Send via Gmail SMTP SSL ───────────────────────────────────────────
        logger.info(f"📧 Sending email to: {to} | Subject: {subject}")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(gmail_address, gmail_password)
            smtp.sendmail(gmail_address, all_recipients, msg.as_string())

        # ── Build response ────────────────────────────────────────────────────
        result = "✅ Email sent successfully!\n"
        result += f"  To: {to}\n"
        result += f"  Subject: {subject}\n"
        if cc:
            result += f"  CC: {cc}\n"
        if attached_files:
            result += f"  Attachments: {', '.join(attached_files)}\n"
        if skipped_files:
            result += f"  ⚠️ Skipped (not found): {', '.join(skipped_files)}\n"

        return result

    except smtplib.SMTPAuthenticationError:
        return (
            "❌ Gmail authentication failed. Make sure:\n"
            "  1. GMAIL_APP_PASSWORD is a valid App Password (not your Gmail login password)\n"
            "  2. 2-Step Verification is enabled on your Google account\n"
            "  3. Generate one at: myaccount.google.com → Security → App Passwords"
        )
    except smtplib.SMTPRecipientsRefused as e:
        return f"❌ Invalid recipient address: {e}"
    except Exception as e:
        logger.error(f"send_email_tool error: {e}")
        import traceback

        traceback.print_exc()
        return f"❌ Failed to send email: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# PDF REPORT GENERATION TOOL
# Requires: pip install reportlab
# Saves PDF to /tmp/ so send_email_tool can attach it via attachment_paths
# ═══════════════════════════════════════════════════════════════════════════════
@tool
def send_whatsapp_message_tool(
    text: str,
    phone_number: Optional[str] = None,
) -> str:
    """
    Send a WhatsApp message via the Shared Global UltraMsg Account.

    Args:
        text: The message content to send.
        phone_number: Optional recipient phone number (with country code, e.g., +91...).
                      Defaults to the number in your Profile.
    """
    ctx = get_tool_context()
    user_id = ctx.get("user_id")

    # Fetch global credentials from environment
    instance_id = os.environ.get("WHATSAPP_INSTANCE_ID")
    token = os.environ.get("WHATSAPP_TOKEN")

    # Fetch recipient number from profile if not provided
    if user_id and not phone_number:
        from models.profile import Profile

        profile = Profile.find_by_user(user_id)
        if profile:
            integrations = profile.get("integrations", {})
            phone_number = integrations.get("whatsapp_number")

    if not all([instance_id, token, phone_number]):
        return "❌ WhatsApp setup incomplete. Please ensure the System Administrator has configured WHATSAPP_INSTANCE_ID and WHATSAPP_TOKEN, and that you have added your Phone Number in Profile -> Integrations."

    return send_whatsapp_notification(instance_id, token, phone_number, text)


@tool
def generate_pdf_report_tool(
    report_type: str = "overdue",
    project_name: Optional[str] = None,
    output_path: Optional[str] = None,
) -> str:
    """
    Generate a PDF report of tasks and save it to disk.
    Use the returned file path with send_email_tool's attachment_paths to email it.

    Args:
        report_type: Type of report to generate:
                     - "overdue"   → All overdue tasks (default)
                     - "all"       → All tasks across projects
                     - "analytics" → Project analytics summary (requires project_name)
                     - "workload"  → Current user's assigned tasks
        project_name: Filter by project name (optional for overdue/all, required for analytics)
        output_path:  Where to save the PDF (default: /tmp/report_<type>_<timestamp>.pdf)

    Returns:
        File path of the generated PDF, or an error message.

    Examples:
        # Generate and get the path
        path = generate_pdf_report_tool(report_type="overdue")

        # Then email it
        send_email_tool(
            to="manager@company.com",
            subject="Overdue Tasks Report",
            body="Please find the overdue tasks report attached.",
            attachment_paths=path
        )
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
            HRFlowable,
        )
        from reportlab.lib.enums import TA_CENTER

        # ── Resolve output path ───────────────────────────────────────────────
        if not output_path:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            proj_slug = f"_{project_name.replace(' ', '_')}" if project_name else ""
            output_path = f"/tmp/report_{report_type}{proj_slug}_{timestamp}.pdf"

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email", "")

        # ── Fetch data based on report_type ───────────────────────────────────
        tasks = []
        report_title = "Task Report"
        analytics_data = None

        if report_type == "overdue":
            report_title = "Overdue Tasks Report"
            query = {
                "due_date": {"$lt": datetime.utcnow().strftime("%Y-%m-%d")},
                "status": {"$ne": "Done"},
            }
            if project_name:
                from utils.langgraph_agent_automation import resolve_project_id

                pid = resolve_project_id(user_id, project_name=project_name)
                if pid:
                    query["project_id"] = pid
                    report_title = f"Overdue Tasks — {project_name}"
            else:
                projects = list(
                    db.projects.find(
                        {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
                    )
                )
                query["project_id"] = {"$in": [str(p["_id"]) for p in projects]}
            tasks = list(db.tasks.find(query).limit(200))

        elif report_type == "all":
            report_title = "All Tasks Report"
            projects = list(
                db.projects.find(
                    {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
                )
            )
            query = {"project_id": {"$in": [str(p["_id"]) for p in projects]}}
            if project_name:
                from utils.langgraph_agent_automation import resolve_project_id

                pid = resolve_project_id(user_id, project_name=project_name)
                if pid:
                    query["project_id"] = pid
                    report_title = f"All Tasks — {project_name}"
            tasks = list(db.tasks.find(query).limit(200))

        elif report_type == "workload":
            report_title = f"Workload Report — {user_email}"
            tasks = list(db.tasks.find({"assignee_email": user_email}).limit(200))

        elif report_type == "analytics":
            if not project_name:
                return "❌ report_type='analytics' requires a project_name."
            from utils.langgraph_agent_automation import resolve_project_id

            pid = resolve_project_id(user_id, project_name=project_name)
            if not pid:
                return f"❌ Project '{project_name}' not found."
            tasks = list(db.tasks.find({"project_id": pid}))
            report_title = f"Analytics Report — {project_name}"

            # Pre-compute analytics
            total = len(tasks)
            today = datetime.utcnow().strftime("%Y-%m-%d")
            by_status, by_priority = {}, {}
            overdue_count = 0
            for t in tasks:
                s = t.get("status", "To Do")
                by_status[s] = by_status.get(s, 0) + 1
                p = t.get("priority", "Medium")
                by_priority[p] = by_priority.get(p, 0) + 1
                if t.get("due_date") and t["due_date"] < today and s != "Done":
                    overdue_count += 1
            done = by_status.get("Done", 0)
            analytics_data = {
                "total": total,
                "overdue": overdue_count,
                "completion_rate": (done / total * 100) if total > 0 else 0,
                "by_status": by_status,
                "by_priority": by_priority,
            }
        else:
            return f"❌ Unknown report_type '{report_type}'. Use: overdue, all, workload, analytics."

        # ── Define styles ─────────────────────────────────────────────────────
        styles = getSampleStyleSheet()

        BRAND_DARK = colors.HexColor("#1E293B")  # slate-800
        BRAND_ACCENT = colors.HexColor("#6366F1")  # indigo-500
        BRAND_LIGHT = colors.HexColor("#F1F5F9")  # slate-100
        BRAND_MUTED = colors.HexColor("#64748B")  # slate-500
        RED = colors.HexColor("#EF4444")
        ORANGE = colors.HexColor("#F97316")
        GREEN = colors.HexColor("#22C55E")
        YELLOW = colors.HexColor("#EAB308")

        style_title = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontSize=22,
            textColor=BRAND_DARK,
            spaceAfter=4,
            fontName="Helvetica-Bold",
        )
        style_subtitle = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=BRAND_MUTED,
            spaceAfter=16,
            fontName="Helvetica",
        )
        style_section = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            textColor=BRAND_ACCENT,
            spaceBefore=18,
            spaceAfter=8,
            fontName="Helvetica-Bold",
        )
        style_normal = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9,
            textColor=BRAND_DARK,
            fontName="Helvetica",
            leading=13,
        )
        style_small = ParagraphStyle(
            "Small",
            parent=styles["Normal"],
            fontSize=8,
            textColor=BRAND_MUTED,
            fontName="Helvetica",
        )
        style_footer = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            textColor=BRAND_MUTED,
            alignment=TA_CENTER,
        )

        # ── Priority colour helper ─────────────────────────────────────────────
        PRIORITY_COLORS = {
            "Critical": RED,
            "High": ORANGE,
            "Medium": YELLOW,
            "Low": GREEN,
        }
        STATUS_COLORS = {
            "Done": GREEN,
            "In Progress": BRAND_ACCENT,
            "In Review": colors.HexColor("#8B5CF6"),
            "Blocked": RED,
            "To Do": BRAND_MUTED,
        }

        def priority_badge(p):
            c = PRIORITY_COLORS.get(p, BRAND_MUTED)
            return Paragraph(
                f'<font color="#{c.hexval()[2:]}"><b>{p or "—"}</b></font>',
                style_normal,
            )

        def status_badge(s):
            c = STATUS_COLORS.get(s, BRAND_MUTED)
            return Paragraph(
                f'<font color="#{c.hexval()[2:]}"><b>{s or "—"}</b></font>',
                style_normal,
            )

        # ── Build document ────────────────────────────────────────────────────
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        story = []
        generated_at = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

        # ── Header ────────────────────────────────────────────────────────────
        story.append(Paragraph(report_title, style_title))
        story.append(Paragraph(f"Generated on {generated_at}", style_subtitle))
        story.append(
            HRFlowable(width="100%", thickness=1.5, color=BRAND_ACCENT, spaceAfter=12)
        )

        # ── Analytics block (for analytics report type) ───────────────────────
        if analytics_data:
            story.append(Paragraph("Summary", style_section))

            summary_data = [
                ["Metric", "Value"],
                ["Total Tasks", str(analytics_data["total"])],
                ["Overdue Tasks", str(analytics_data["overdue"])],
                ["Completion Rate", f"{analytics_data['completion_rate']:.1f}%"],
            ]
            for status, count in analytics_data["by_status"].items():
                summary_data.append([f"Status: {status}", str(count)])
            for priority, count in analytics_data["by_priority"].items():
                summary_data.append([f"Priority: {priority}", str(count)])

            summary_table = Table(summary_data, colWidths=[100 * mm, 50 * mm])
            summary_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 10),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, BRAND_LIGHT],
                        ),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 9),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                        ("ROUNDEDCORNERS", [4]),
                    ]
                )
            )
            story.append(summary_table)
            story.append(Spacer(1, 10))

        # ── Task table ────────────────────────────────────────────────────────
        if tasks:
            story.append(Paragraph(f"Tasks ({len(tasks)})", style_section))

            # Resolve project names for display
            project_cache = {}
            for task in tasks:
                pid = task.get("project_id", "")
                if pid and pid not in project_cache:
                    proj = (
                        db.projects.find_one({"_id": ObjectId(pid)})
                        if len(pid) == 24
                        else None
                    )
                    project_cache[pid] = proj.get("name", "—") if proj else "—"

            # Table header
            col_widths = [18 * mm, 65 * mm, 32 * mm, 22 * mm, 22 * mm, 22 * mm]
            table_data = [
                [
                    Paragraph("<b>Ticket</b>", style_normal),
                    Paragraph("<b>Title</b>", style_normal),
                    Paragraph("<b>Project</b>", style_normal),
                    Paragraph("<b>Priority</b>", style_normal),
                    Paragraph("<b>Status</b>", style_normal),
                    Paragraph("<b>Due Date</b>", style_normal),
                ]
            ]

            for task in tasks:
                ticket = task.get("ticket_id", "—")
                title = task.get("title", "Untitled")[:60] + (
                    "…" if len(task.get("title", "")) > 60 else ""
                )
                project = project_cache.get(task.get("project_id", ""), "—")
                due = task.get("due_date", "—")

                # Flag overdue dates in red
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                due_para = Paragraph(
                    f'<font color="#EF4444"><b>{due}</b></font>'
                    if due != "—" and due < today_str and task.get("status") != "Done"
                    else due,
                    style_normal,
                )

                table_data.append(
                    [
                        Paragraph(ticket, style_small),
                        Paragraph(title, style_normal),
                        Paragraph(project[:28], style_small),
                        priority_badge(task.get("priority", "Medium")),
                        status_badge(task.get("status", "To Do")),
                        due_para,
                    ]
                )

            task_table = Table(table_data, colWidths=col_widths, repeatRows=1)
            task_table.setStyle(
                TableStyle(
                    [
                        # Header row
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        # Alternating rows
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.white, BRAND_LIGHT],
                        ),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 8),
                        # Padding
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        # Grid
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ]
                )
            )
            story.append(task_table)

        else:
            story.append(Paragraph("No tasks found for this report.", style_normal))

        # ── Footer ────────────────────────────────────────────────────────────
        story.append(Spacer(1, 20))
        story.append(
            HRFlowable(width="100%", thickness=0.5, color=BRAND_MUTED, spaceAfter=6)
        )
        story.append(
            Paragraph(
                f"DOIT Task Management  •  {generated_at}  •  {len(tasks)} task(s) listed",
                style_footer,
            )
        )

        # ── Build PDF ─────────────────────────────────────────────────────────
        doc.build(story)

        logger.info(f"📄 PDF report saved to: {output_path}")
        return output_path

    except ImportError:
        return (
            "❌ reportlab is not installed. Run:\n  pip install reportlab\nthen retry."
        )
    except Exception as e:
        logger.error(f"generate_pdf_report_tool error: {e}")
        import traceback

        traceback.print_exc()
        return f"❌ Failed to generate PDF report: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# TASK MANAGEMENT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def create_task_tool(
    title: str,
    project_name: str,
    description: str = "",
    priority: str = "Medium",
    assignee_email: Optional[str] = None,
    due_date: Optional[str] = None,
    issue_type: str = "task",
    labels: Optional[str] = None,
) -> str:
    """
    Create a new task in a project.

    Args:
        title: Task title (required)
        project_name: Name of the project (required)
        description: Task description
        priority: Priority level (Low, Medium, High, Critical)
        assignee_email: Email of person to assign task to
        due_date: Due date in YYYY-MM-DD format
        issue_type: Type (task, bug, story, epic)
        labels: Comma-separated labels (e.g., "frontend,urgent")

    Returns:
        Success message with ticket ID
    """
    try:
        from controllers.agent_task_controller import agent_create_task_sync
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email")

        project_id = resolve_project_id(user_id, project_name=project_name)

        if not project_id:
            projects = list(
                db.projects.find(
                    {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
                )
            )
            available = [p.get("name", "") for p in projects]
            return f"❌ Project '{project_name}' not found. Available projects: {available}"

        labels_list = [label.strip() for label in labels.split(",")] if labels else []

        result = agent_create_task_sync(
            requesting_user=user_email,
            title=title,
            project_id=project_id,
            user_id=user_id,
            description=description,
            assignee_email=assignee_email,
            priority=priority,
            status="To Do",
            due_date=due_date,
            issue_type=issue_type,
            labels=labels_list,
        )

        ticket_id = result.get("ticket_id", "")
        msg = f"✅ Task '{title}' created successfully in project {project_name}!"
        if assignee_email:
            msg += f" Assigned to {assignee_email}."
        if due_date:
            msg += f" Due date: {due_date}."
        if ticket_id:
            msg += f" Ticket ID: {ticket_id}"

        return msg

    except Exception as e:
        logger.error(f"create_task_tool error: {e}")
        import traceback

        traceback.print_exc()
        return f"❌ Failed to create task: {str(e)}"


@tool
def create_multiple_tasks_tool(
    project_name: str,
    tasks_description: str,
) -> str:
    """
    Create multiple tasks at once from a description.

    Args:
        project_name: Name of the project
        tasks_description: Tasks, one per line e.g. "Fix login bug\nAdd user profile"

    Returns:
        Summary of created tasks
    """
    try:
        from controllers.agent_task_controller import agent_create_task_sync
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        task_titles = [t.strip() for t in tasks_description.split("\n") if t.strip()]
        if not task_titles:
            return "❌ No tasks to create."

        created = []
        failed = []

        for title in task_titles:
            try:
                result = agent_create_task_sync(
                    requesting_user=user_email,
                    title=title,
                    project_id=project_id,
                    user_id=user_id,
                    status="To Do",
                    issue_type="task",
                )
                created.append(result.get("ticket_id", title))
            except Exception as e:
                failed.append(f"{title}: {str(e)}")

        msg = f"✅ Created {len(created)} tasks in {project_name}"
        if created:
            msg += f"\nTickets: {', '.join(created)}"
        if failed:
            msg += f"\n❌ Failed ({len(failed)}): {', '.join(failed[:3])}"

        return msg

    except Exception as e:
        logger.error(f"create_multiple_tasks_tool error: {e}")
        return f"❌ Failed to create tasks: {str(e)}"


@tool
def list_tasks_tool(
    project_name: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_email: Optional[str] = None,
    overdue_only: bool = False,
) -> str:
    """
    List tasks with optional filtering.

    Args:
        project_name: Filter by project name
        status: Filter by status (To Do, In Progress, Done, etc.)
        priority: Filter by priority (Low, Medium, High, Critical)
        assignee_email: Filter by assignee email
        overdue_only: Show only overdue tasks

    Returns:
        List of tasks with details
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        projects = list(
            db.projects.find(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
            )
        )
        project_ids = [str(p["_id"]) for p in projects]
        query = {"project_id": {"$in": project_ids}}

        if project_name:
            project_id = resolve_project_id(user_id, project_name=project_name)
            if project_id:
                query["project_id"] = project_id

        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if assignee_email:
            query["assignee_email"] = assignee_email
        if overdue_only:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            query["due_date"] = {"$lt": today}
            query["status"] = {"$ne": "Done"}

        tasks = list(db.tasks.find(query).limit(20))

        if not tasks:
            return "No tasks found matching the criteria."

        result = f"Found {len(tasks)} task(s):\n\n"
        for task in tasks:
            result += f"• [{task.get('ticket_id', 'N/A')}] {task.get('title')}\n"
            result += (
                f"  Status: {task.get('status')} | Priority: {task.get('priority')}\n"
            )
            if task.get("assignee_email"):
                result += f"  Assigned to: {task.get('assignee_email')}\n"
            if task.get("due_date"):
                result += f"  Due: {task.get('due_date')}\n"
            result += "\n"

        return result

    except Exception as e:
        logger.error(f"list_tasks_tool error: {e}")
        return f"❌ Failed to list tasks: {str(e)}"


@tool
def update_task_status_tool(task_identifier: str, new_status: str) -> str:
    """
    Update a task's status.

    Args:
        task_identifier: Task title, ticket ID, or task ID
        new_status: New status (To Do, In Progress, In Review, Done, Blocked)

    Returns:
        Success message
    """
    try:
        from utils.langgraph_agent_automation import find_task_by_title_or_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        task = find_task_by_title_or_id(user_id, task_title=task_identifier)
        if not task:
            return f"❌ Task '{task_identifier}' not found."

        db.tasks.update_one(
            {"_id": ObjectId(task["_id"])},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
        )

        return f"✅ Task '{task['title']}' status updated to '{new_status}'"

    except Exception as e:
        logger.error(f"update_task_status_tool error: {e}")
        return f"❌ Failed to update task: {str(e)}"


@tool
def bulk_update_tasks_tool(
    project_name: str,
    filter_status: Optional[str] = None,
    filter_priority: Optional[str] = None,
    new_status: Optional[str] = None,
    new_priority: Optional[str] = None,
    new_assignee_email: Optional[str] = None,
) -> str:
    """
    Bulk update multiple tasks at once.

    Args:
        project_name: Project to update tasks in
        filter_status: Filter tasks by current status
        filter_priority: Filter tasks by priority
        new_status: New status to set
        new_priority: New priority to set
        new_assignee_email: New assignee to set

    Returns:
        Summary of updates
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        query = {"project_id": project_id}
        if filter_status:
            query["status"] = filter_status
        if filter_priority:
            query["priority"] = filter_priority

        update_data = {"updated_at": datetime.utcnow()}
        if new_status:
            update_data["status"] = new_status
        if new_priority:
            update_data["priority"] = new_priority
        if new_assignee_email:
            assignee = db.users.find_one({"email": new_assignee_email})
            if assignee:
                update_data["assignee_email"] = assignee["email"]
                update_data["assignee_name"] = assignee.get("name", new_assignee_email)
                update_data["assignee_id"] = str(assignee["_id"])

        result = db.tasks.update_many(query, {"$set": update_data})
        return f"✅ Updated {result.modified_count} tasks in {project_name}"

    except Exception as e:
        logger.error(f"bulk_update_tasks_tool error: {e}")
        return f"❌ Failed to bulk update: {str(e)}"


@tool
def assign_task_tool(task_identifier: str, assignee_email: str) -> str:
    """
    Assign a task to a team member.

    Args:
        task_identifier: Task title, ticket ID, or task ID
        assignee_email: Email of the person to assign to

    Returns:
        Success message
    """
    try:
        from utils.langgraph_agent_automation import find_task_by_title_or_id
        from controllers.agent_task_controller import agent_assign_task_sync

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email")

        task = find_task_by_title_or_id(user_id, task_title=task_identifier)
        if not task:
            return f"❌ Task '{task_identifier}' not found."

        agent_assign_task_sync(
            requesting_user=user_email,
            task_id=task["_id"],
            assignee_identifier=assignee_email,
            user_id=user_id,
        )

        return f"✅ Task '{task['title']}' assigned to {assignee_email}"

    except Exception as e:
        logger.error(f"assign_task_tool error: {e}")
        return f"❌ Failed to assign task: {str(e)}"


@tool
def delete_task_tool(task_identifier: str) -> str:
    """
    Delete a task.

    Args:
        task_identifier: Task title, ticket ID, or task ID

    Returns:
        Success message
    """
    try:
        from utils.langgraph_agent_automation import find_task_by_title_or_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        task = find_task_by_title_or_id(user_id, task_title=task_identifier)
        if not task:
            return f"❌ Task '{task_identifier}' not found."

        db.tasks.delete_one({"_id": ObjectId(task["_id"])})
        return f"✅ Task '{task['title']}' deleted successfully"

    except Exception as e:
        logger.error(f"delete_task_tool error: {e}")
        return f"❌ Failed to delete task: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# SPRINT MANAGEMENT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def create_sprint_tool(
    sprint_name: str,
    project_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    goal: str = "",
    duration_weeks: Optional[int] = None,
) -> str:
    """
    Create a new sprint in a project.

    Args:
        sprint_name: Name of the sprint
        project_name: Name of the project
        start_date: Start date in YYYY-MM-DD format (defaults to today)
        end_date: End date in YYYY-MM-DD format
        goal: Sprint goal/objective
        duration_weeks: Auto-calculate end date (e.g., 2 for 2-week sprint)

    Returns:
        Success message
    """
    try:
        from controllers.agent_sprint_controller import agent_create_sprint_sync
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        if duration_weeks and not end_date:
            if not start_date:
                start_date = datetime.utcnow().strftime("%Y-%m-%d")
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_date = (start_dt + timedelta(weeks=duration_weeks)).strftime("%Y-%m-%d")

        agent_create_sprint_sync(
            requesting_user=user_email,
            name=sprint_name,
            project_id=project_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            goal=goal,
        )

        msg = (
            f"✅ Sprint '{sprint_name}' created successfully in project {project_name}"
        )
        if start_date and end_date:
            msg += f" ({start_date} to {end_date})"
        return msg

    except Exception as e:
        logger.error(f"create_sprint_tool error: {e}")
        return f"❌ Failed to create sprint: {str(e)}"


@tool
def add_task_to_sprint_tool(task_identifier: str, sprint_name: str) -> str:
    """
    Add a task to a sprint.

    Args:
        task_identifier: Task title, ticket ID, or task ID
        sprint_name: Name of the sprint

    Returns:
        Success message
    """
    try:
        from utils.langgraph_agent_automation import (
            find_task_by_title_or_id,
            find_sprint_by_name_or_id,
        )

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        task = find_task_by_title_or_id(user_id, task_title=task_identifier)
        if not task:
            return f"❌ Task '{task_identifier}' not found."

        sprint = find_sprint_by_name_or_id(user_id, sprint_name=sprint_name)
        if not sprint:
            return f"❌ Sprint '{sprint_name}' not found."

        db.tasks.update_one(
            {"_id": ObjectId(task["_id"])},
            {"$set": {"sprint_id": sprint["_id"], "updated_at": datetime.utcnow()}},
        )

        return f"✅ Task '{task['title']}' added to sprint '{sprint['name']}'"

    except Exception as e:
        logger.error(f"add_task_to_sprint_tool error: {e}")
        return f"❌ Failed to add task to sprint: {str(e)}"


@tool
def add_multiple_tasks_to_sprint_tool(
    project_name: str,
    sprint_name: str,
    filter_status: Optional[str] = None,
    filter_priority: Optional[str] = None,
) -> str:
    """
    Add multiple tasks to a sprint based on filters.

    Args:
        project_name: Project name
        sprint_name: Sprint name
        filter_status: Filter tasks by status (e.g., "To Do")
        filter_priority: Filter tasks by priority (e.g., "High")

    Returns:
        Summary of added tasks
    """
    try:
        from utils.langgraph_agent_automation import (
            resolve_project_id,
            find_sprint_by_name_or_id,
        )

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        sprint = find_sprint_by_name_or_id(user_id, sprint_name=sprint_name)
        if not sprint:
            return f"❌ Sprint '{sprint_name}' not found."

        query = {"project_id": project_id, "sprint_id": {"$exists": False}}
        if filter_status:
            query["status"] = filter_status
        if filter_priority:
            query["priority"] = filter_priority

        result = db.tasks.update_many(
            query,
            {"$set": {"sprint_id": sprint["_id"], "updated_at": datetime.utcnow()}},
        )

        return f"✅ Added {result.modified_count} tasks to sprint '{sprint_name}'"

    except Exception as e:
        logger.error(f"add_multiple_tasks_to_sprint_tool error: {e}")
        return f"❌ Failed to add tasks: {str(e)}"


@tool
def list_sprints_tool(
    project_name: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """
    List sprints, optionally filtered by project and status.

    Args:
        project_name: Filter by project name
        status: Filter by status (planned, active, completed)

    Returns:
        List of sprints
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        query = {}

        if project_name:
            project_id = resolve_project_id(user_id, project_name=project_name)
            if project_id:
                query["project_id"] = project_id
        else:
            projects = list(
                db.projects.find(
                    {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
                )
            )
            project_ids = [str(p["_id"]) for p in projects]
            query["project_id"] = {"$in": project_ids}

        if status:
            query["status"] = status

        sprints = list(db.sprints.find(query))
        if not sprints:
            return "No sprints found."

        result = f"Found {len(sprints)} sprint(s):\n\n"
        for sprint in sprints:
            task_count = db.tasks.count_documents({"sprint_id": sprint["_id"]})
            result += (
                f"• {sprint.get('name')} - Status: {sprint.get('status', 'planned')}\n"
            )
            result += f"  Tasks: {task_count}\n"
            if sprint.get("start_date"):
                result += f"  Start: {sprint.get('start_date')}\n"
            if sprint.get("end_date"):
                result += f"  End: {sprint.get('end_date')}\n"
            if sprint.get("goal"):
                result += f"  Goal: {sprint.get('goal')}\n"
            result += "\n"

        return result

    except Exception as e:
        logger.error(f"list_sprints_tool error: {e}")
        return f"❌ Failed to list sprints: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECT MANAGEMENT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def create_project_tool(project_name: str, description: str = "") -> str:
    """
    Create a new project (requires admin role).

    Args:
        project_name: Name of the project
        description: Project description

    Returns:
        Success message
    """
    try:
        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_role = ctx.get("user_role", "").lower()

        if user_role not in ["admin", "super-admin"]:
            return "❌ Only admins can create projects."

        existing = db.projects.find_one({"user_id": user_id, "name": project_name})
        if existing:
            return f"❌ Project '{project_name}' already exists."

        project = {
            "name": project_name,
            "description": description,
            "user_id": user_id,
            "members": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        db.projects.insert_one(project)

        return f"✅ Project '{project_name}' created successfully!"

    except Exception as e:
        logger.error(f"create_project_tool error: {e}")
        return f"❌ Failed to create project: {str(e)}"


@tool
def list_projects_tool() -> str:
    """
    List all projects the user has access to.

    Returns:
        List of projects with task counts
    """
    try:
        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        projects = list(
            db.projects.find(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
            )
        )

        if not projects:
            return "You don't have any projects yet."

        result = f"You have access to {len(projects)} project(s):\n\n"
        for project in projects:
            task_count = db.tasks.count_documents({"project_id": str(project["_id"])})
            done_count = db.tasks.count_documents(
                {"project_id": str(project["_id"]), "status": "Done"}
            )
            result += f"• {project.get('name')}\n"
            result += f"  Description: {project.get('description', 'N/A')}\n"
            result += f"  Members: {len(project.get('members', []))}\n"
            result += f"  Tasks: {done_count}/{task_count} completed\n\n"

        return result

    except Exception as e:
        logger.error(f"list_projects_tool error: {e}")
        return f"❌ Failed to list projects: {str(e)}"


@tool
def add_project_member_tool(project_name: str, member_email: str) -> str:
    """
    Add a member to a project (owner only).

    Args:
        project_name: Name of the project
        member_email: Email of member to add

    Returns:
        Success message
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        project = db.projects.find_one({"_id": ObjectId(project_id)})
        if project["user_id"] != user_id:
            return "❌ Only project owner can add members."

        member = db.users.find_one({"email": member_email})
        if not member:
            return f"❌ User '{member_email}' not found."

        member_id = str(member["_id"])
        if any(m["user_id"] == member_id for m in project.get("members", [])):
            return f"❌ {member_email} is already a member."

        member_data = {
            "user_id": member_id,
            "email": member["email"],
            "name": member.get("name", member_email),
            "added_at": datetime.utcnow().isoformat(),
        }
        db.projects.update_one(
            {"_id": ObjectId(project_id)}, {"$push": {"members": member_data}}
        )

        return f"✅ {member['name']} added to project '{project_name}'"

    except Exception as e:
        logger.error(f"add_project_member_tool error: {e}")
        return f"❌ Failed to add member: {str(e)}"


@tool
def list_team_members_tool(project_name: str) -> str:
    """
    List team members in a project.

    Args:
        project_name: Name of the project

    Returns:
        List of team members
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        project = db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            return f"❌ Project '{project_name}' not found."

        owner = db.users.find_one({"_id": ObjectId(project["user_id"])})
        members = project.get("members", [])

        result = f"Team members in '{project_name}':\n\n"
        if owner:
            result += f"• {owner.get('name')} ({owner.get('email')}) - Owner\n"
        for member in members:
            result += f"• {member.get('name', 'N/A')} ({member.get('email', 'N/A')}) - Member\n"
        result += f"\nTotal: {1 + len(members)} members"

        return result

    except Exception as e:
        logger.error(f"list_team_members_tool error: {e}")
        return f"❌ Failed to list team members: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS & REPORTING TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def get_project_analytics_tool(project_name: str) -> str:
    """
    Get analytics and insights for a project.

    Args:
        project_name: Name of the project

    Returns:
        Project analytics summary
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        project_id = resolve_project_id(user_id, project_name=project_name)
        if not project_id:
            return f"❌ Project '{project_name}' not found."

        tasks = list(db.tasks.find({"project_id": project_id}))
        if not tasks:
            return f"No tasks found in project '{project_name}'."

        total = len(tasks)
        by_status = {}
        by_priority = {}
        overdue = 0
        today = datetime.utcnow().strftime("%Y-%m-%d")

        for task in tasks:
            status = task.get("status", "To Do")
            by_status[status] = by_status.get(status, 0) + 1
            priority = task.get("priority", "Medium")
            by_priority[priority] = by_priority.get(priority, 0) + 1
            if (
                task.get("due_date")
                and task.get("due_date") < today
                and status != "Done"
            ):
                overdue += 1

        done = by_status.get("Done", 0)
        completion_rate = (done / total * 100) if total > 0 else 0

        result = f"📊 Analytics for '{project_name}':\n\n"
        result += f"Total Tasks: {total}\n"
        result += f"Overdue: {overdue}\n\n"
        result += "Status Breakdown:\n"
        for status, count in by_status.items():
            pct = (count / total * 100) if total > 0 else 0
            result += f"  {status}: {count} ({pct:.1f}%)\n"
        result += "\nPriority Breakdown:\n"
        for priority, count in by_priority.items():
            result += f"  {priority}: {count}\n"
        result += f"\n✅ Completion Rate: {completion_rate:.1f}%"

        return result

    except Exception as e:
        logger.error(f"get_project_analytics_tool error: {e}")
        return f"❌ Failed to get analytics: {str(e)}"


@tool
def get_user_workload_tool(user_email: Optional[str] = None) -> str:
    """
    Get workload summary for a user.

    Args:
        user_email: Email of user (defaults to current user)

    Returns:
        Workload summary
    """
    try:
        ctx = get_tool_context()
        target_email = user_email or ctx.get("user_email")

        tasks = list(db.tasks.find({"assignee_email": target_email}))
        if not tasks:
            return f"No tasks assigned to {target_email}."

        total = len(tasks)
        by_status = {}
        by_priority = {}
        overdue = 0
        today = datetime.utcnow().strftime("%Y-%m-%d")

        for task in tasks:
            status = task.get("status", "To Do")
            by_status[status] = by_status.get(status, 0) + 1
            priority = task.get("priority", "Medium")
            by_priority[priority] = by_priority.get(priority, 0) + 1
            if (
                task.get("due_date")
                and task.get("due_date") < today
                and status != "Done"
            ):
                overdue += 1

        result = f"👤 Workload for {target_email}:\n\n"
        result += f"Total Tasks: {total}\n"
        result += f"Overdue: {overdue}\n\n"
        result += "By Status:\n"
        for status, count in sorted(by_status.items()):
            result += f"  {status}: {count}\n"
        result += "\nBy Priority:\n"
        for priority in ["Critical", "High", "Medium", "Low"]:
            count = by_priority.get(priority, 0)
            if count > 0:
                result += f"  {priority}: {count}\n"

        return result

    except Exception as e:
        logger.error(f"get_user_workload_tool error: {e}")
        return f"❌ Failed to get workload: {str(e)}"


@tool
def get_overdue_tasks_tool(project_name: Optional[str] = None) -> str:
    """
    Get all overdue tasks.

    Args:
        project_name: Filter by project (optional)

    Returns:
        List of overdue tasks
    """
    try:
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        query = {
            "due_date": {"$lt": datetime.utcnow().strftime("%Y-%m-%d")},
            "status": {"$ne": "Done"},
        }

        if project_name:
            project_id = resolve_project_id(user_id, project_name=project_name)
            if project_id:
                query["project_id"] = project_id
        else:
            projects = list(
                db.projects.find(
                    {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
                )
            )
            project_ids = [str(p["_id"]) for p in projects]
            query["project_id"] = {"$in": project_ids}

        tasks = list(db.tasks.find(query).limit(20))
        if not tasks:
            return "No overdue tasks found! 🎉"

        result = f"⚠️ Found {len(tasks)} overdue task(s):\n\n"
        for task in tasks:
            result += f"• [{task.get('ticket_id', 'N/A')}] {task.get('title')}\n"
            result += (
                f"  Due: {task.get('due_date')} | Priority: {task.get('priority')}\n"
            )
            if task.get("assignee_email"):
                result += f"  Assigned to: {task.get('assignee_email')}\n"
            result += "\n"

        return result

    except Exception as e:
        logger.error(f"get_overdue_tasks_tool error: {e}")
        return f"❌ Failed to get overdue tasks: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE MANAGEMENT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def update_user_profile_tool(
    phone: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """
    Update user profile information.

    Args:
        phone: Phone number
        bio: Bio/description
        location: Location

    Returns:
        Success message
    """
    try:
        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        profile = db.profiles.find_one({"user_id": user_id})
        if not profile:
            db.profiles.insert_one(
                {
                    "user_id": user_id,
                    "personal": {},
                    "created_at": datetime.utcnow(),
                }
            )

        update_data = {}
        if phone:
            update_data["personal.phone"] = phone
        if bio:
            update_data["personal.bio"] = bio
        if location:
            update_data["personal.location"] = location

        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            db.profiles.update_one({"user_id": user_id}, {"$set": update_data})

        return "✅ Profile updated successfully"

    except Exception as e:
        logger.error(f"update_user_profile_tool error: {e}")
        return f"❌ Failed to update profile: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# SMITHERY / GITHUB TOOLS (Via Smithery CLI)
# ═══════════════════════════════════════════════════════════════════════════════


def call_smithery_tool(server_id: str, tool_name: str, args: dict) -> str:
    """Helper to call any Smithery tool via CLI with Windows-safe quoting."""
    try:
        # Compact common separators (remove spaces) to avoid argument count errors on Windows shells
        json_args = json.dumps(args, separators=(",", ":"))

        # Build the command string. We escape double quotes for the Windows shell wrapper " "
        escaped_json = json_args.replace('"', '\\"')
        cmd = f'npx -y @smithery/cli@latest tool call {server_id} {tool_name} "{escaped_json}"'

        logger.info(f"🛠️ Executing Smithery: {cmd}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            shell=True,  # Mandatory for command resolution and correct quoting on Windows
        )

        if result.returncode != 0:
            error_output = result.stderr or result.stdout
            logger.error(f"❌ Smithery CLI error ({result.returncode}): {error_output}")
            return f"❌ Smithery Error: {error_output}"

        return result.stdout
    except Exception as e:
        logger.error(f"❌ Unexpected smithery error: {e}")
        return f"❌ Backend Error: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# GITHUB TOOLS (Direct GitHub REST API — no Smithery CLI subprocess)
# Set in your .env:
#   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx   ← github.com → Settings → Developer settings → PAT
# ═══════════════════════════════════════════════════════════════════════════════


GITHUB_API_BASE = "https://api.github.com"


def _normalize_repo_slug(repo: str) -> Optional[str]:
    if not repo:
        return None
    cleaned = repo.strip().rstrip("/")
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        match = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$", cleaned)
        if not match:
            return None
        return f"{match.group(1)}/{match.group(2)}"
    if "/" not in cleaned:
        return None
    owner, repo_name = cleaned.split("/", 1)
    if not owner or not repo_name:
        return None
    return f"{owner}/{repo_name}"


def _token_from_profile(user_id: Optional[str]) -> Optional[str]:
    if not user_id:
        return None
    try:
        from models.profile import Profile
        from utils.github_utils import decrypt_token

        profile = Profile.find_by_user(user_id)
        integrations = (profile or {}).get("integrations", {})
        encrypted = integrations.get("github_token_encrypted")
        if encrypted:
            return decrypt_token(encrypted)
    except Exception as exc:
        logger.warning("GitHub profile token read failed for user %s: %s", user_id, exc)
    return None


def _owner_token_for_repo(user_id: Optional[str], repo: Optional[str]) -> Optional[str]:
    repo_slug = _normalize_repo_slug(repo or "")
    if not user_id or not repo_slug:
        return None

    try:
        owned_or_member_projects = list(
            db.projects.find(
                {
                    "$or": [
                        {"user_id": user_id},
                        {"members.user_id": user_id},
                    ]
                },
                {"user_id": 1, "git_repo_url": 1},
            )
        )
    except Exception as exc:
        logger.warning("Failed to lookup projects for GitHub token routing: %s", exc)
        return None

    for project in owned_or_member_projects:
        project_repo = _normalize_repo_slug(project.get("git_repo_url") or "")
        if project_repo and project_repo.lower() == repo_slug.lower():
            owner_id = project.get("user_id")
            return _token_from_profile(owner_id)

    return None


def _github_headers(repo: Optional[str] = None) -> dict:
    token = None
    ctx = get_tool_context()
    user_id = ctx.get("user_id")

    # If this repo is tied to an accessible project, always prefer the project owner's token.
    if repo and user_id:
        token = _owner_token_for_repo(user_id, repo)

    # Fallback to the current user's own token.
    if not token:
        token = _token_from_profile(user_id)

    if not token:
        token = os.environ.get("GITHUB_TOKEN")

    if not token:
        raise RuntimeError(
            "GitHub token not configured. Add it in Profile -> Integrations, "
            "or configure GITHUB_TOKEN in environment."
        )
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


@tool
def github_list_issues_tool(repo: str, state: str = "open") -> str:
    """
    List issues in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format (e.g., 'kchoudhary-parkar/Github_Testing_Project')
        state: 'open', 'closed', or 'all'
    """
    try:
        url = f"{GITHUB_API_BASE}/repos/{repo}/issues"
        resp = httpx.get(
            url, headers=_github_headers(repo), params={"state": state, "per_page": 20}
        )
        resp.raise_for_status()
        issues = resp.json()

        if not issues:
            return f"No {state} issues found in {repo}."

        result = f"📋 {len(issues)} {state} issue(s) in {repo}:\n\n"
        for issue in issues:
            result += f"• #{issue['number']} {issue['title']}\n"
            result += f"  State: {issue['state']} | By: {issue['user']['login']}\n"
            if issue.get("assignees"):
                assignees = ", ".join(a["login"] for a in issue["assignees"])
                result += f"  Assigned to: {assignees}\n"
            result += "\n"
        return result

    except httpx.HTTPStatusError as e:
        return f"❌ GitHub API error {e.response.status_code}: {e.response.text}"
    except Exception as e:
        logger.error(f"github_list_issues_tool error: {e}")
        return f"❌ Failed to list issues: {str(e)}"


@tool
def github_create_branch_tool(repo: str, branch: str, from_branch: str = "main") -> str:
    """
    Create a new branch in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format
        branch: Name of the new branch to create
        from_branch: Branch to branch from (default: 'main')
    """
    return (
        "❌ Automation disabled. This LangGraph agent is read-only for GitHub operations. "
        "Creating branches is not allowed."
    )


@tool
def github_create_or_update_file_tool(
    repo: str,
    path: str,
    content: str,
    message: str,
    branch: Optional[str] = None,
) -> str:
    """
    Create or update a file in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format
        path: File path in the repo (e.g., 'docs/TEST_LOG.md')
        content: The file content (plain text — will be base64 encoded automatically)
        message: Commit message
        branch: Target branch (optional, defaults to the repo's default branch)
    """
    return (
        "❌ Automation disabled. This LangGraph agent is read-only for GitHub operations. "
        "Committing or updating files is not allowed."
    )


@tool
def github_list_branches_tool(repo: str, limit: int = 20) -> str:
    """
    List branches in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format.
        limit: Maximum number of branches to return (default: 20).
    """
    try:
        safe_limit = max(1, min(limit, 100))
        url = f"{GITHUB_API_BASE}/repos/{repo}/branches"
        resp = httpx.get(
            url, headers=_github_headers(repo), params={"per_page": safe_limit}
        )
        resp.raise_for_status()
        branches = resp.json()

        if not branches:
            return f"No branches found in {repo}."

        lines = [f"🌿 Branches in {repo} ({len(branches)}):"]
        for branch in branches:
            name = branch.get("name", "unknown")
            sha = ((branch.get("commit") or {}).get("sha") or "")[:7]
            lines.append(f"- {name} (tip: {sha})")
        return "\n".join(lines)
    except httpx.HTTPStatusError as e:
        return f"❌ GitHub API error {e.response.status_code}: {e.response.text}"
    except Exception as e:
        logger.error(f"github_list_branches_tool error: {e}")
        return f"❌ Failed to list branches: {str(e)}"


@tool
def github_list_pull_requests_tool(
    repo: str, state: str = "open", limit: int = 20
) -> str:
    """
    List pull requests in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format.
        state: Pull request state: 'open', 'closed', or 'all'.
        limit: Maximum number of pull requests to return (default: 20).
    """
    try:
        safe_limit = max(1, min(limit, 100))
        pr_state = state if state in {"open", "closed", "all"} else "open"
        url = f"{GITHUB_API_BASE}/repos/{repo}/pulls"
        resp = httpx.get(
            url,
            headers=_github_headers(repo),
            params={
                "state": pr_state,
                "per_page": safe_limit,
                "sort": "updated",
                "direction": "desc",
            },
        )
        resp.raise_for_status()
        prs = resp.json()

        if not prs:
            return f"No {pr_state} pull requests found in {repo}."

        lines = [f"🔀 {pr_state.title()} PRs in {repo} ({len(prs)}):"]
        for pr in prs:
            number = pr.get("number")
            title = pr.get("title", "Untitled")
            author = (pr.get("user") or {}).get("login", "unknown")
            head = (pr.get("head") or {}).get("ref") or "-"
            base = (pr.get("base") or {}).get("ref") or "-"
            lines.append(f"- #{number} {title} | {author} | {head} -> {base}")
        return "\n".join(lines)
    except httpx.HTTPStatusError as e:
        return f"❌ GitHub API error {e.response.status_code}: {e.response.text}"
    except Exception as e:
        logger.error(f"github_list_pull_requests_tool error: {e}")
        return f"❌ Failed to list pull requests: {str(e)}"


@tool
def github_latest_commits_tool(
    repo: str, branch: Optional[str] = None, limit: int = 5
) -> str:
    """
    Get latest commits from a repository (optionally a specific branch).

    Args:
        repo: Repository in 'owner/repo' format.
        branch: Optional branch name.
        limit: Number of commits to return (default: 5).
    """
    try:
        safe_limit = max(1, min(limit, 20))
        url = f"{GITHUB_API_BASE}/repos/{repo}/commits"
        params = {"per_page": safe_limit}
        if branch:
            params["sha"] = branch

        resp = httpx.get(url, headers=_github_headers(repo), params=params)
        resp.raise_for_status()
        commits = resp.json()

        if not commits:
            target = f"branch '{branch}'" if branch else "default branch"
            return f"No commits found for {target} in {repo}."

        target = f"branch '{branch}'" if branch else "default branch"
        lines = [f"🧾 Latest commits in {repo} ({target}):"]
        for commit in commits:
            sha = (commit.get("sha") or "")[:7]
            data = commit.get("commit") or {}
            message = (data.get("message") or "").split("\n", 1)[0]
            author = (data.get("author") or {}).get("name", "unknown")
            lines.append(f"- {sha} {message} ({author})")
        return "\n".join(lines)
    except httpx.HTTPStatusError as e:
        return f"❌ GitHub API error {e.response.status_code}: {e.response.text}"
    except Exception as e:
        logger.error(f"github_latest_commits_tool error: {e}")
        return f"❌ Failed to fetch latest commits: {str(e)}"


@tool
def github_latest_changes_tool(repo: str, branch: Optional[str] = None) -> str:
    """
    Summarize file-level changes from the latest commit.

    Args:
        repo: Repository in 'owner/repo' format.
        branch: Optional branch name.
    """
    try:
        params = {"per_page": 1}
        if branch:
            params["sha"] = branch

        latest_resp = httpx.get(
            f"{GITHUB_API_BASE}/repos/{repo}/commits",
            headers=_github_headers(repo),
            params=params,
        )
        latest_resp.raise_for_status()
        commits = latest_resp.json()

        if not commits:
            return f"No commits found in {repo}."

        latest = commits[0]
        sha = latest.get("sha")
        detail_resp = httpx.get(
            f"{GITHUB_API_BASE}/repos/{repo}/commits/{sha}",
            headers=_github_headers(repo),
        )
        detail_resp.raise_for_status()
        detail = detail_resp.json()

        commit_data = detail.get("commit") or {}
        headline = (commit_data.get("message") or "").split("\n", 1)[0]
        author = (commit_data.get("author") or {}).get("name", "unknown")
        files = detail.get("files") or []
        stats = detail.get("stats") or {}

        lines = [
            f"🧠 Latest changes in {repo}",
            f"- Commit: {(sha or '')[:7]}",
            f"- Message: {headline}",
            f"- Author: {author}",
            f"- Files changed: {stats.get('total', len(files))}",
            f"- Additions: {stats.get('additions', 0)} | Deletions: {stats.get('deletions', 0)}",
        ]

        if files:
            lines.append("- Touched files:")
            for file_info in files[:12]:
                filename = file_info.get("filename", "unknown")
                status = file_info.get("status", "modified")
                additions = file_info.get("additions", 0)
                deletions = file_info.get("deletions", 0)
                lines.append(f"  • {filename} [{status}] (+{additions} / -{deletions})")

        return "\n".join(lines)
    except httpx.HTTPStatusError as e:
        return f"❌ GitHub API error {e.response.status_code}: {e.response.text}"
    except Exception as e:
        logger.error(f"github_latest_changes_tool error: {e}")
        return f"❌ Failed to fetch latest changes: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# ADVANCED AI-POWERED TOOLS
# ═══════════════════════════════════════════════════════════════════════════════


@tool
def breakdown_epic_tool(
    epic_title: str, epic_description: str, project_name: str
) -> str:
    """
    Break down a high-level Epic or feature into small, actionable sub-tasks.
    Automatically creates the generated tasks in the specified project.

    Args:
        epic_title: High-level feature name
        epic_description: Detailed requirements or context
        project_name: Current project to add tasks to
    """
    try:
        llm = get_llm()
        prompt = f"""
        Analyze the following Epic requirements and break them down into 4-7 actionable, granular tasks.
        Epic: {epic_title}
        Context: {epic_description}
        
        Return the result ONLY as a JSON list of objects, each with:
        "title": (string)
        "description": (string, 1-2 sentences of detail)
        "priority": (Low, Medium, High, Critical)
        
        ONLY return valid JSON array.
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        # Clean up response (sometimes models add ```json)
        content = response.content.strip().replace("```json", "").replace("```", "")
        tasks_data = json.loads(content)

        from controllers.agent_task_controller import agent_create_task_sync
        from utils.langgraph_agent_automation import resolve_project_id

        ctx = get_tool_context()
        user_id = ctx.get("user_id")
        user_email = ctx.get("user_email")

        pid = resolve_project_id(user_id, project_name=project_name)
        if not pid:
            return f"❌ Project '{project_name}' not found. Epic breakdown aborted."

        results = []
        for t in tasks_data:
            try:
                res = agent_create_task_sync(
                    requesting_user=user_email,
                    title=t["title"],
                    project_id=pid,
                    user_id=user_id,
                    description=t.get("description", ""),
                    priority=t.get("priority", "Medium"),
                    status="To Do",
                    issue_type="task",
                )
                results.append(
                    f"• ✅ {t['title']} (Ticket: {res.get('ticket_id', 'N/A')})"
                )
            except Exception as task_err:
                results.append(f"• ❌ Failed to create '{t['title']}': {str(task_err)}")

        return (
            f"🚀 **Epic Breakdown Complete for '{epic_title}'**\n\nGenerated {len(tasks_data)} tasks in project '{project_name}':\n"
            + "\n".join(results)
        )
    except Exception as e:
        logger.error(f"breakdown_epic_tool error: {e}")
        return f"❌ Failed to breakdown epic: {str(e)}"


@tool
def generate_standup_tool() -> str:
    """
    Analyze recent project activity and generate a professional daily standup update.
    Identifies what was completed recently and what is currently planned.
    """
    try:
        ctx = get_tool_context()
        user_email = ctx.get("user_email")

        # 1. Fetch data from DB
        one_day_ago = datetime.utcnow() - timedelta(days=1)

        recent_done = list(
            db.tasks.find(
                {
                    "assignee_email": user_email,
                    "status": "Done",
                    "updated_at": {"$gte": one_day_ago},
                }
            ).limit(5)
        )

        in_progress = list(
            db.tasks.find(
                {"assignee_email": user_email, "status": "In Progress"}
            ).limit(5)
        )

        planned = list(
            db.tasks.find({"assignee_email": user_email, "status": "To Do"}).limit(5)
        )

        # 2. Use LLM to reason and format
        llm = get_llm()
        context_str = f"""
        Completed recently: {[t["title"] for t in recent_done]}
        Working on: {[t["title"] for t in in_progress]}
        Next in queue: {[t["title"] for t in planned]}
        """

        prompt = f"""
        Generate a professional, concise daily standup update based on this task activity:
        {context_str}
        
        Format as:
        Yesterday: (Summarize completions)
        Today: (Summarize current focus)
        Blockers: (None identified, unless items seem overdue)
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        return f"📝 **Daily Standup Update**\n\n{response.content}"
    except Exception as e:
        logger.error(f"generate_standup_tool error: {e}")
        return f"❌ Failed to generate standup: {str(e)}"


@tool
def auto_triage_task_tool(task_title: str, task_description: str) -> str:
    """
    AI-powered task triaging. Suggests priority, labels, and implementation reasoning
    for any incoming feature request or bug report.
    """
    try:
        llm = get_llm()
        prompt = f"""
        Analyze this task and recommend triage values:
        Title: {task_title}
        Description: {task_description}
        
        Provide JSON only:
        {{
            "priority": "Low|Medium|High|Critical",
            "issue_type": "task|bug|story|epic",
            "labels": ["list", "of", "labels"],
            "reasoning": "one sentence explanation"
        }}
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip().replace("```json", "").replace("```", "")
        triage = json.loads(content)

        return (
            f"🔍 **AI Triage Suggestion**\n"
            f"- **Complexity**: {triage.get('priority', 'N/A')}\n"
            f"- **Type**: {triage.get('issue_type', 'N/A')}\n"
            f"- **Labels**: {', '.join(triage.get('labels', []))}\n"
            f"- **AI Reasoning**: {triage.get('reasoning', 'No reasoning provided.')}"
        )
    except Exception as e:
        logger.error(f"auto_triage_task_tool error: {e}")
        return f"❌ AI Triage failed: {str(e)}"


@tool
def search_project_knowledge_tool(query: str) -> str:
    """
    Search across historical tasks, project descriptions, and comments for specific technical
    solutions, previous decisions, or historical context. Used for 'Knowledge Retrieval'.
    """
    try:
        ctx = get_tool_context()
        user_id = ctx.get("user_id")

        # Resolve projects accessible by user
        projects = list(
            db.projects.find(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
            )
        )
        pids = [str(p["_id"]) for p in projects]

        # Regex search in tasks for similar patterns (Hybrid search)
        tasks = list(
            db.tasks.find(
                {
                    "project_id": {"$in": pids},
                    "$or": [
                        {"title": {"$regex": query, "$options": "i"}},
                        {"description": {"$regex": query, "$options": "i"}},
                        {"comments.text": {"$regex": query, "$options": "i"}},
                    ],
                }
            )
            .sort("updated_at", -1)
            .limit(6)
        )

        if not tasks:
            return f"No historical knowledge found for your query: '{query}'"

        result = f"📚 **Historical Knowledge & Context Found**\nFound {len(tasks)} relevant items from your project history:\n\n"
        for t in tasks:
            result += (
                f"• **[{t.get('ticket_id', 'N/A')}] {t['title']}** ({t['status']})\n"
            )
            if t.get("description"):
                snippet = t["description"][:120].replace("\n", " ") + "..."
                result += f"  > {snippet}\n"
            result += "\n"

        result += (
            "💡 *Tip: You can ask me to summarize a specific ticket for more details.*"
        )
        return result
    except Exception as e:
        logger.error(f"search_project_knowledge_tool error: {e}")
        return f"❌ Knowledge search failed: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# EXTERNAL INTEGRATIONS (Discord, Teams, Slack)
# ═══════════════════════════════════════════════════════════════════════════════


# @tool
# def send_discord_message_tool(
#     content: str,
#     title: str = "DOIT Notification",
#     webhook_url: Optional[str] = None,
#     project_id: Optional[str] = None,
# ) -> str:
#     """
#     Send a message to a Discord channel via Webhook.

#     Args:
#         content: The message content to send (Markdown supported).
#         title: Optional title for the Discord embed.
#         webhook_url: Optional override for the Discord webhook URL.
#         project_id: Project ID to use project/team integration if available.
#     """
#     ctx = get_tool_context()
#     user_id = ctx.get("user_id")
#     url = webhook_url

#     # 1. Project/team integration (preferred)
#     if not url and project_id:
#         try:
#             from models.team_integration import TeamIntegration

#             integration = TeamIntegration.find_by_project_and_platform(
#                 project_id, "discord"
#             )
#             if integration and integration.get("credentials", {}).get("webhook_url"):
#                 url = integration["credentials"]["webhook_url"]
#         except Exception as e:
#             logger.warning(f"Failed to fetch Discord team integration: {e}")

#     # 2. User profile integration (fallback)
#     if not url and user_id:
#         from models.profile import Profile

#         profile = Profile.find_by_user(user_id)
#         if profile:
#             url = profile.get("integrations", {}).get("discord_webhook")

#     # 3. Environment variable (last resort)
#     if not url:
#         url = os.environ.get("DISCORD_WEBHOOK_URL")

#     if not url:
#         return "❌ Discord Webhook URL not configured. Please set it in your Project Integrations."

#     return send_discord_notification(url, content, title)


# @tool
# def send_teams_message_tool(
#     text: str,
#     title: str = "DOIT Alert",
#     webhook_url: Optional[str] = None,
#     project_id: Optional[str] = None,
# ) -> str:
#     """
#     Send a message to a Microsoft Teams channel via Webhook.

#     Args:
#         text: The message text to send.
#         title: Optional title for the message card.
#         webhook_url: Optional override for the Teams webhook URL.
#         project_id: Project ID to use project/team integration if available.
#     """
#     ctx = get_tool_context()
#     user_id = ctx.get("user_id")
#     url = webhook_url

#     # 1. Project/team integration (preferred)
#     if not url and project_id:
#         try:
#             from models.team_integration import TeamIntegration

#             integration = TeamIntegration.find_by_project_and_platform(
#                 project_id, "teams"
#             )
#             if integration and integration.get("credentials", {}).get("webhook_url"):
#                 url = integration["credentials"]["webhook_url"]
#         except Exception as e:
#             logger.warning(f"Failed to fetch Teams team integration: {e}")

#     # 2. User profile integration (fallback)
#     if not url and user_id:
#         from models.profile import Profile

#         profile = Profile.find_by_user(user_id)
#         if profile:
#             url = profile.get("integrations", {}).get("teams_webhook")

#     # 3. Environment variable (last resort)
#     if not url:
#         url = os.environ.get("TEAMS_WEBHOOK_URL")

#     if not url:
#         return "❌ Teams Webhook URL not configured. Please set it in your Project Integrations."

#     return send_teams_notification(url, text, title)


# @tool

# def send_slack_message_tool(
#     text: str,
#     webhook_url: Optional[str] = None,
#     project_id: Optional[str] = None,
# ) -> str:
#     """
#     Send a message to a Slack channel via Slack BOT TOKEN (preferred) or Webhook.

#     Args:
#         text: The message text to send.
#         webhook_url: Optional override for the Slack webhook URL.
#         project_id: Project ID to use project/team integration if available.
#     """
#     ctx = get_tool_context()
#     user_id = ctx.get("user_id")
#     url = webhook_url
#     bot_token = None
#     channel_id = None

#     # 1. Project/team integration (preferred)
#     if project_id:
#         try:
#             from models.team_integration import TeamIntegration

#             integration = TeamIntegration.find_by_project_and_platform(
#                 project_id, "slack"
#             )
#             if integration:
#                 creds = integration.get("credentials", {})
#                 # Prefer bot token mode if available
#                 bot_token = creds.get("bot_token")
#                 channel_id = creds.get("channel_id")
#                 if creds.get("webhook_url") and not (bot_token and channel_id):
#                     url = creds.get("webhook_url")
#         except Exception as e:
#             logger.warning(f"Failed to fetch Slack team integration: {e}")

#     # 2. User profile integration (fallback, webhook only)
#     if not (bot_token and channel_id) and not url and user_id:
#         from models.profile import Profile

#         profile = Profile.find_by_user(user_id)
#         if profile:
#             url = profile.get("integrations", {}).get("slack_webhook")

#     # 3. Environment variable (last resort, webhook only)
#     if not (bot_token and channel_id) and not url:
#         url = os.environ.get("SLACK_WEBHOOK_URL")

#     # Send using bot token if available, else webhook
#     from utils.notification_utils import send_slack_notification
#     if bot_token and channel_id:
#         return send_slack_notification(bot_token=bot_token, channel_id=channel_id, text=text)
#     elif url:
#         return send_slack_notification(webhook_url=url, text=text)
#     else:
#         return "❌ Slack credentials not configured. Please set them in your Project Integrations."


def get_all_langgraph_tools():
    """Return all available LangGraph tools."""
    return [
        # Email
        send_email_tool,
        # Task Management
        create_task_tool,
        create_multiple_tasks_tool,
        list_tasks_tool,
        update_task_status_tool,
        bulk_update_tasks_tool,
        assign_task_tool,
        delete_task_tool,
        # Sprint Management
        create_sprint_tool,
        add_task_to_sprint_tool,
        add_multiple_tasks_to_sprint_tool,
        list_sprints_tool,
        # Project Management
        create_project_tool,
        list_projects_tool,
        add_project_member_tool,
        list_team_members_tool,
        # Analytics & Reporting
        get_project_analytics_tool,
        get_user_workload_tool,
        get_overdue_tasks_tool,
        # Profile Management
        update_user_profile_tool,
        generate_pdf_report_tool,
        # GitHub (Read-only)
        github_list_issues_tool,
        github_list_branches_tool,
        github_list_pull_requests_tool,
        github_latest_commits_tool,
        github_latest_changes_tool,
        # Advanced AI Tools
        breakdown_epic_tool,
        generate_standup_tool,
        auto_triage_task_tool,
        search_project_knowledge_tool,
        # External Integrations
        send_slack_message_tool,
        send_whatsapp_message_tool,
    ]
