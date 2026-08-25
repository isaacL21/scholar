# 🎓 Scholar — AI Academic OS

> Manage your syllabus, notes, and deadlines with an AI tutor powered by Claude.
> Built for Ohio State Fisher College of Business. **Optimized for Replit.**

---

## 🚀 Getting started on Replit (3 steps)

### Step 1 — Import this project
1. Go to [replit.com](https://replit.com) and sign in
2. Click **+ Create Repl**
3. Choose **Import from GitHub** — paste the repo URL
   - OR click **Upload folder** and drag the `scholar/` folder in

### Step 2 — Add your Anthropic API key (Secrets)
1. In the left sidebar, click the **🔒 Secrets** (lock icon)
2. Click **+ New Secret**
3. Key: `ANTHROPIC_API_KEY`
4. Value: `sk-ant-...` (your key from console.anthropic.com)
5. Click **Add Secret**

> ⚠️ Never paste your key directly into the code — always use Secrets.

### Step 3 — Hit Run ▶️
Click the big **Run** button at the top. Scholar will:
- Install all Python dependencies automatically
- Install all Node.js dependencies automatically
- Start the FastAPI backend on port 8000
- Start the Next.js frontend on port 3000
- Open in the Webview panel automatically

**That's it.** The Webview tab shows your live app.

---

## Using Scholar

| Tab | What to do |
|---|---|
| 📚 **Syllabus** | Drop any class PDF → Claude extracts topics, exams, deadlines |
| 📝 **Notes** | Upload PDF notes or paste lecture text → AI indexes them |
| 📊 **Dashboard** | All deadlines with countdown timers, overdue alerts |
| 🤖 **AI Tutor** | Ask questions, get quizzed, build study guides from your own notes |

---

## AI Tutor modes

| Mode | What it does |
|---|---|
| **Ask** | Answer any question from your notes |
| **Quiz Me** | Generate 5 practice questions on a topic |
| **Study Guide** | Build a structured guide from your notes |
| **Explain** | Simple explanation with analogies |

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | FastAPI, Python 3.11 |
| AI | Claude 3.5 Sonnet (Anthropic) |
| Vector DB | ChromaDB (local, persistent) |
| Embeddings | sentence-transformers (runs locally, no extra API) |
| PDF parsing | pypdf |

---

## Scaling up later
- Swap ChromaDB → Pinecone for cloud vector storage
- Add Supabase for auth + multi-user support
- Deploy frontend to Vercel, backend to Railway
- Add Google Calendar sync for deadline reminders
