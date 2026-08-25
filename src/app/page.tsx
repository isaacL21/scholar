"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import {
  LayoutDashboard,
  BookOpen,
  StickyNote,
  Bot,
  GraduationCap,
  RefreshCw,
} from "lucide-react";

import Dashboard from "@/components/Dashboard";
import SyllabusDropzone from "@/components/SyllabusDropzone";
import NotesDropzone from "@/components/NotesDropzone";
import AiTutor from "@/components/AiTutor";
import { getCourses, getDeadlines, getNotes, Course, Deadline, Note } from "@/lib/api";

type Tab = "dashboard" | "syllabus" | "notes" | "tutor";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "syllabus", label: "Syllabus", icon: <BookOpen className="w-4 h-4" /> },
  { id: "notes", label: "Notes", icon: <StickyNote className="w-4 h-4" /> },
  { id: "tutor", label: "AI Tutor", icon: <Bot className="w-4 h-4" /> },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [courses, setCourses] = useState<Course[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d, n] = await Promise.all([getCourses(), getDeadlines(), getNotes()]);
      setCourses(c);
      setDeadlines(d);
      setNotes(n);
      setBackendDown(false);
    } catch {
      setBackendDown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-500" />
            <span className="font-bold text-gray-900 text-lg">Scholar</span>
            <span className="text-xs text-gray-400 hidden sm:inline ml-1">
              · AI Academic OS · Fisher College of Business
            </span>
          </div>
          <button
            onClick={refresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Backend down banner */}
      {backendDown && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-700">
          ⚠️ Backend is not running. Start it with{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">
            uvicorn main:app --reload
          </code>{" "}
          inside <code className="font-mono bg-amber-100 px-1 rounded">scholar/backend/</code>
        </div>
      )}

      {/* Tab nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {tab === "dashboard" && (
          <Dashboard courses={courses} deadlines={deadlines} notes={notes} />
        )}

        {tab === "syllabus" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Syllabus Upload</h2>
              <p className="text-sm text-gray-500 mt-1">
                Drop your syllabus PDF — Claude will extract all topics, exam dates, assignments, and deadlines automatically.
              </p>
            </div>
            <SyllabusDropzone
              onUploaded={(course) => {
                setCourses((prev) => [...prev, course]);
                // Re-fetch deadlines since they were added to the store
                getDeadlines().then(setDeadlines);
              }}
            />

            {/* Parsed courses preview */}
            {courses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Parsed Courses ({courses.length})
                </h3>
                <div className="space-y-3">
                  {courses.map((c) => (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                              {c.course_code}
                            </span>
                            <h4 className="font-semibold text-gray-800">{c.course_name}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{c.instructor && `Instructor: ${c.instructor}`}</p>
                          <p className="text-sm text-gray-600 mb-3">{c.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {c.topics.map((t, i) => (
                              <span
                                key={i}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{c.filename}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notes</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload or paste lecture notes. Scholar embeds them so the AI Tutor can answer questions directly from your notes.
              </p>
            </div>
            <NotesDropzone
              courses={courses}
              onUploaded={(note) => setNotes((prev) => [...prev, note])}
            />

            {notes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Saved Notes ({notes.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="font-medium text-gray-800 text-sm">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-1 mb-2">
                        {courses.find((c) => c.id === n.course_id)?.course_code ?? "Unknown course"}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-3 font-mono">{n.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "tutor" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Tutor</h2>
              <p className="text-sm text-gray-500 mt-1">
                Powered by Claude — asks questions, gets quizzed, builds study guides, or gets topic explanations from your own notes.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <AiTutor courses={courses} />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        Scholar · Built for Ohio State Fisher College of Business · Powered by Claude
      </footer>
    </div>
  );
}
