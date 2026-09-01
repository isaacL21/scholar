"use client";

import { useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { FileText, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Note, Course } from "@/lib/api";

interface Props {
  notes: Note[];
  courses: Course[];
}

export default function NotesViewer({ notes, courses }: Props) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<string>("all");

  const courseNotes = activeCourse === "all"
    ? notes
    : notes.filter((n) => n.course_id === activeCourse);

  // Group notes by course
  const grouped = courses.reduce<Record<string, Note[]>>((acc, c) => {
    acc[c.id] = notes.filter((n) => n.course_id === c.id);
    return acc;
  }, {});

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-brand-500 opacity-40" />
        <p className="font-medium text-gray-600">No notes yet</p>
        <p className="text-sm mt-1">Upload or paste notes above — Claude will break them down automatically</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCourse("all")}
          className={clsx(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            activeCourse === "all"
              ? "bg-brand-500 text-white border-brand-500"
              : "text-gray-600 border-gray-300 hover:border-brand-500"
          )}
        >
          All ({notes.length})
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCourse(c.id)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeCourse === c.id
                ? "bg-brand-500 text-white border-brand-500"
                : "text-gray-600 border-gray-300 hover:border-brand-500"
            )}
          >
            {c.course_code} ({grouped[c.id]?.length ?? 0})
          </button>
        ))}
      </div>

      {/* Per-course doc view */}
      {activeCourse !== "all" ? (
        <div className="space-y-3">
          {courseNotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notes for this course yet.</p>
          ) : (
            courseNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                expanded={expandedNote === note.id}
                onToggle={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              />
            ))
          )}
        </div>
      ) : (
        // All courses view — grouped
        <div className="space-y-6">
          {courses.map((c) => {
            const cn = grouped[c.id] ?? [];
            if (cn.length === 0) return null;
            return (
              <div key={c.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                    {c.course_code}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-700">{c.course_name}</h3>
                  <span className="text-xs text-gray-400">{cn.length} note{cn.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {cn.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expanded={expandedNote === note.id}
                      onToggle={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  expanded,
  onToggle,
}: {
  note: Note;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{note.title}</p>
            <p className="text-xs text-gray-400 truncate">{note.course_name}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{note.breakdown || note.preview}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
