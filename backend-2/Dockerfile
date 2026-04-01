# ── Base image ────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ── Set working directory ──────────────────────────────────────────────────────
WORKDIR /app

# ── System deps needed by some Python packages (e.g. PyMuPDF, chromadb) ───────
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Install Python dependencies first (cached layer) ──────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy application code ──────────────────────────────────────────────────────
COPY . .

# ── Create uploads directory (used by StaticFiles mount) ─────────────────────
RUN mkdir -p uploads/chat_attachments uploads/ai_images uploads/ai_attachments

# ── Expose port (Railway sets $PORT dynamically) ──────────────────────────────
EXPOSE 8000

# ── Start command ─────────────────────────────────────────────────────────────
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
