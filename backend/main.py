import os
import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

import anthropic
import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

load_dotenv()

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Scholar API")

# Allow all origins — handles Replit's dynamic preview URLs (*.replit.dev, *.repl.co)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Clients ──────────────────────────────────────────────────────────────────
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
chroma = chromadb.PersistentClient(path=CHROMA_DIR)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Collections
syllabi_col = chroma.get_or_create_collection("syllabi")
notes_col = chroma.get_or_create_collection("notes")

# Simple JSON file-based store for structured data
DATA_FILE = Path("./data/store.json")
DATA_FILE.parent.mkdir(exist_ok=True)


def load_store() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {"courses": [], "deadlines": [], "notes": []}


def save_store(data: dict):
    DATA_FILE.write_text(json.dumps(data, indent=2))


# ── Helpers ──────────────────────────────────────────────────────────────────
def extract_pdf_text(file_bytes: bytes) -> str:
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start : start + size])
        start += size - overlap
    return chunks


def embed(texts: list[str]) -> list[list[float]]:
    return embedder.encode(texts).tolist()


def parse_syllabus_with_claude(text: str) -> dict:
    """Ask Claude to extract structured info from syllabus text."""
    prompt = f"""You are an academic assistant. Extract structured information from this syllabus.

Return ONLY valid JSON with this exact shape:
{{
  "course_name": "string",
  "course_code": "string",
  "instructor": "string",
  "topics": ["topic1", "topic2", ...],
  "deadlines": [
    {{"title": "string", "date": "YYYY-MM-DD or approximate", "type": "exam|assignment|project|quiz"}}
  ],
  "description": "1-2 sentence summary"
}}

SYLLABUS TEXT:
{text[:8000]}"""

    msg = claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "api_key_set": bool(os.getenv("ANTHROPIC_API_KEY"))}


@app.post("/syllabi/upload")
async def upload_syllabus(file: UploadFile = File(...)):
    """Upload a PDF syllabus, parse it with Claude, store embeddings."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    raw_bytes = await file.read()
    text = extract_pdf_text(raw_bytes)

    if len(text.strip()) < 50:
        raise HTTPException(422, "Could not extract text from PDF.")

    try:
        parsed = parse_syllabus_with_claude(text)
    except Exception as e:
        raise HTTPException(500, f"Claude parsing failed: {e}")

    course_id = str(uuid.uuid4())
    parsed["id"] = course_id
    parsed["filename"] = file.filename

    # Embed and store in ChromaDB
    chunks = chunk_text(text)
    ids = [f"{course_id}_{i}" for i in range(len(chunks))]
    embeddings = embed(chunks)
    syllabi_col.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"course_id": course_id, "course_name": parsed.get("course_name", "")} for _ in chunks],
    )

    # Persist structured data
    store = load_store()
    store["courses"].append(parsed)
    for d in parsed.get("deadlines", []):
        d["course_id"] = course_id
        d["course_name"] = parsed.get("course_name", "")
        d["id"] = str(uuid.uuid4())
        store["deadlines"].append(d)
    save_store(store)

    return {"success": True, "course": parsed}


@app.post("/notes/upload")
async def upload_note(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    title: str = Form(...),
    course_id: str = Form(...),
):
    """Upload a PDF note file or paste raw text."""
    store = load_store()

    if file:
        raw_bytes = await file.read()
        content = extract_pdf_text(raw_bytes)
    elif text:
        content = text
    else:
        raise HTTPException(400, "Provide a file or text.")

    note_id = str(uuid.uuid4())
    note = {"id": note_id, "title": title, "course_id": course_id, "preview": content[:200]}
    store["notes"].append(note)
    save_store(store)

    # Embed and store
    chunks = chunk_text(content)
    ids = [f"{note_id}_{i}" for i in range(len(chunks))]
    embeddings = embed(chunks)
    notes_col.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"note_id": note_id, "course_id": course_id, "title": title} for _ in chunks],
    )

    return {"success": True, "note": note}


@app.get("/courses")
def get_courses():
    store = load_store()
    return store["courses"]


@app.get("/deadlines")
def get_deadlines():
    store = load_store()
    return sorted(store["deadlines"], key=lambda d: d.get("date", "9999"))


@app.get("/notes")
def get_notes():
    store = load_store()
    return store["notes"]


class TutorRequest(BaseModel):
    question: str
    course_id: Optional[str] = None
    mode: str = "tutor"  # tutor | quiz | studyguide | explain


@app.post("/tutor/ask")
def ask_tutor(req: TutorRequest):
    """RAG-powered AI tutor using notes + syllabus context via Claude."""
    q_embed = embed([req.question])[0]

    context_chunks = []
    where = {"course_id": req.course_id} if req.course_id else None

    try:
        note_results = notes_col.query(
            query_embeddings=[q_embed],
            n_results=4,
            where=where,
        )
        context_chunks.extend(note_results["documents"][0])
    except Exception:
        pass

    try:
        syl_results = syllabi_col.query(
            query_embeddings=[q_embed],
            n_results=3,
            where=where,
        )
        context_chunks.extend(syl_results["documents"][0])
    except Exception:
        pass

    context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No notes uploaded yet."

    mode_instructions = {
        "tutor": "Answer the student's question clearly and thoroughly using the context. Give examples where helpful.",
        "quiz": "Generate 5 multiple choice quiz questions with answers based on the context and the topic the student mentioned.",
        "studyguide": "Create a structured study guide with key concepts, definitions, and important points from the context.",
        "explain": "Explain the concept in simple terms with analogies and real-world examples, like you're tutoring a college student.",
    }

    instruction = mode_instructions.get(req.mode, mode_instructions["tutor"])

    prompt = f"""You are Scholar, an expert AI academic tutor for a college student at Ohio State University Fisher College of Business.

INSTRUCTION: {instruction}

STUDENT'S NOTES & SYLLABUS CONTEXT:
{context}

STUDENT'S QUESTION/REQUEST:
{req.question}

Respond in clean markdown."""

    msg = claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    return {"response": msg.content[0].text, "sources_used": len(context_chunks)}


@app.delete("/courses/{course_id}")
def delete_course(course_id: str):
    store = load_store()
    store["courses"] = [c for c in store["courses"] if c["id"] != course_id]
    store["deadlines"] = [d for d in store["deadlines"] if d.get("course_id") != course_id]
    store["notes"] = [n for n in store["notes"] if n.get("course_id") != course_id]
    save_store(store)
    return {"success": True}
