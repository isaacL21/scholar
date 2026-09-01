import os
import json
import uuid
import hashlib
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import anthropic
import chromadb

load_dotenv()

app = FastAPI(title="Scholar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
chroma = chromadb.PersistentClient(path=CHROMA_DIR)
syllabi_col = chroma.get_or_create_collection("syllabi")
notes_col   = chroma.get_or_create_collection("notes")

DATA_FILE = Path("./data/store.json")
DATA_FILE.parent.mkdir(exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_store() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {"courses": [], "deadlines": [], "notes": []}


def save_store(data: dict):
    DATA_FILE.write_text(json.dumps(data, indent=2))


def extract_pdf_text(file_bytes: bytes) -> str:
    """Try multiple PDF extraction methods for maximum compatibility."""
    import io

    # Method 1: pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if text.strip():
            return text
    except Exception:
        pass

    # Method 2: pdfminer
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract
        text = pdfminer_extract(io.BytesIO(file_bytes))
        if text.strip():
            return text
    except Exception:
        pass

    # Method 3: raw text extraction (last resort)
    try:
        raw = file_bytes.decode("latin-1", errors="ignore")
        import re
        chunks = re.findall(r'\(([^\)]{4,})\)', raw)
        text = " ".join(chunks)
        if len(text.strip()) > 100:
            return text
    except Exception:
        pass

    return ""


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start: start + size])
        start += size - overlap
    return chunks


def simple_embed(text: str) -> list[float]:
    dim = 256
    vec = [0.0] * dim
    for i in range(len(text) - 2):
        h = int(hashlib.md5(text.lower()[i:i+3].encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = sum(x * x for x in vec) ** 0.5
    return [x / norm for x in vec] if norm > 0 else vec


def embed(texts: list[str]) -> list[list[float]]:
    return [simple_embed(t) for t in texts]


def parse_syllabus_with_claude(text: str) -> dict:
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
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def breakdown_note_with_claude(text: str, course_name: str, title: str) -> str:
    """Claude breaks down a note into structured study content."""
    prompt = f"""You are Scholar, an AI academic assistant for a student at Ohio State Fisher College of Business.

A student has uploaded notes titled "{title}" for their course "{course_name}".

Break these notes down into a clean, structured study document with:
- ## Key Concepts (bullet points)
- ## Definitions (term: definition format)
- ## Important Formulas or Frameworks (if any)
- ## Summary (3-5 sentences)
- ## Likely Exam Topics (bullet list)

Be concise but thorough. Use markdown formatting.

NOTES CONTENT:
{text[:6000]}"""

    msg = claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "api_key_set": bool(os.getenv("ANTHROPIC_API_KEY"))}


@app.post("/syllabi/upload")
async def upload_syllabus(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    raw_bytes = await file.read()
    text = extract_pdf_text(raw_bytes)
    if len(text.strip()) < 50:
        raise HTTPException(422, "Could not extract text — PDF may be a scanned image. Try copy-pasting the text into Notes tab instead.")
    try:
        parsed = parse_syllabus_with_claude(text)
    except Exception as e:
        raise HTTPException(500, f"Claude parsing failed: {e}")
    course_id = str(uuid.uuid4())
    parsed["id"] = course_id
    parsed["filename"] = file.filename
    try:
        chunks = chunk_text(text)
        syllabi_col.add(
            ids=[f"{course_id}_{i}" for i in range(len(chunks))],
            documents=chunks,
            embeddings=embed(chunks),
            metadatas=[{"course_id": course_id, "course_name": parsed.get("course_name", "")} for _ in chunks],
        )
    except Exception as e:
        raise HTTPException(500, f"Vector storage failed: {e}")
    try:
        store = load_store()
        store["courses"].append(parsed)
        for d in parsed.get("deadlines", []):
            d["course_id"] = course_id
            d["course_name"] = parsed.get("course_name", "")
            d["id"] = str(uuid.uuid4())
            store["deadlines"].append(d)
        save_store(store)
    except Exception as e:
        raise HTTPException(500, f"Store save failed: {e}")
    return {"success": True, "course": parsed}


class CourseCreate(BaseModel):
    course_name: str
    course_code: str
    instructor: str = ""
    description: str = ""
    topics: list[str] = []


@app.post("/courses/create")
def create_course(body: CourseCreate):
    store = load_store()
    course = {
        "id": str(uuid.uuid4()),
        "course_name": body.course_name,
        "course_code": body.course_code,
        "instructor": body.instructor,
        "description": body.description,
        "topics": body.topics,
        "deadlines": [],
        "filename": "manual",
    }
    store["courses"].append(course)
    save_store(store)
    return {"success": True, "course": course}


@app.post("/notes/upload")
async def upload_note(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    title: str = Form(...),
    course_id: str = Form(...),
):
    store = load_store()
    course_name = next((c["course_name"] for c in store["courses"] if c["id"] == course_id), "Unknown Course")

    if file:
        raw_bytes = await file.read()
        content = extract_pdf_text(raw_bytes)
        if not content.strip():
            raise HTTPException(422, "Could not extract text from PDF.")
    elif text:
        content = text
    else:
        raise HTTPException(400, "Provide a file or text.")

    # Claude breaks down the note into structured study content
    try:
        breakdown = breakdown_note_with_claude(content, course_name, title)
    except Exception as e:
        breakdown = content  # fallback to raw content if Claude fails

    note_id = str(uuid.uuid4())
    note = {
        "id": note_id,
        "title": title,
        "course_id": course_id,
        "course_name": course_name,
        "preview": content[:200],
        "breakdown": breakdown,
    }
    store["notes"].append(note)
    save_store(store)

    try:
        chunks = chunk_text(content)
        notes_col.add(
            ids=[f"{note_id}_{i}" for i in range(len(chunks))],
            documents=chunks,
            embeddings=embed(chunks),
            metadatas=[{"note_id": note_id, "course_id": course_id, "title": title} for _ in chunks],
        )
    except Exception as e:
        raise HTTPException(500, f"Vector storage failed: {e}")

    return {"success": True, "note": note}


@app.get("/courses")
def get_courses():
    return load_store()["courses"]


@app.get("/deadlines")
def get_deadlines():
    store = load_store()
    return sorted(store["deadlines"], key=lambda d: d.get("date", "9999"))


@app.get("/notes")
def get_notes():
    return load_store()["notes"]


@app.get("/notes/course/{course_id}")
def get_notes_by_course(course_id: str):
    store = load_store()
    return [n for n in store["notes"] if n.get("course_id") == course_id]


class TutorRequest(BaseModel):
    question: str
    course_id: Optional[str] = None
    mode: str = "tutor"


@app.post("/tutor/ask")
def ask_tutor(req: TutorRequest):
    q_embed = simple_embed(req.question)
    context_chunks = []
    where = {"course_id": req.course_id} if req.course_id else None
    try:
        note_results = notes_col.query(query_embeddings=[q_embed], n_results=4, where=where)
        context_chunks.extend(note_results["documents"][0])
    except Exception:
        pass
    try:
        syl_results = syllabi_col.query(query_embeddings=[q_embed], n_results=3, where=where)
        context_chunks.extend(syl_results["documents"][0])
    except Exception:
        pass

    # Also include note breakdowns as context
    store = load_store()
    if req.course_id:
        course_notes = [n for n in store["notes"] if n.get("course_id") == req.course_id]
    else:
        course_notes = store["notes"]
    for n in course_notes[:3]:
        if n.get("breakdown"):
            context_chunks.append(f"[Study breakdown for {n['title']}]\n{n['breakdown'][:600]}")

    context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No notes uploaded yet."
    mode_instructions = {
        "tutor":      "Answer the student's question clearly and thoroughly using the context. Give examples where helpful.",
        "quiz":       "Generate 5 multiple choice quiz questions with answers based on the context and topic the student mentioned.",
        "studyguide": "Create a structured study guide with key concepts, definitions, and important points from the context.",
        "explain":    "Explain the concept in simple terms with analogies and real-world examples, like tutoring a college student.",
    }
    prompt = f"""You are Scholar, an expert AI academic tutor for a college student at Ohio State University Fisher College of Business.

INSTRUCTION: {mode_instructions.get(req.mode, mode_instructions["tutor"])}

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
    store["courses"]   = [c for c in store["courses"]   if c["id"] != course_id]
    store["deadlines"] = [d for d in store["deadlines"] if d.get("course_id") != course_id]
    store["notes"]     = [n for n in store["notes"]     if n.get("course_id") != course_id]
    save_store(store)
    return {"success": True}
