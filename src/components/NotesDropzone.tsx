"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import { UploadCloud, Loader2, StickyNote } from "lucide-react";
import { uploadNote, Note, Course } from "@/lib/api";

interface Props {
  courses: Course[];
  onUploaded: (note: Note) => void;
}

export default function NotesDropzone({ courses, onUploaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) setDroppedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: loading || mode === "paste",
  });

  const handleSubmit = async () => {
    if (!title.trim()) return setError("Add a title for this note.");
    if (!courseId) return setError("Select a course.");
    if (mode === "file" && !droppedFile) return setError("Drop a PDF first.");
    if (mode === "paste" && !pastedText.trim()) return setError("Paste some notes first.");

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await uploadNote({
        title,
        course_id: courseId,
        file: mode === "file" ? droppedFile! : undefined,
        text: mode === "paste" ? pastedText : undefined,
      });
      setSuccess(`✓ Saved: ${data.note.title}`);
      onUploaded(data.note);
      setTitle("");
      setPastedText("");
      setDroppedFile(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["file", "paste"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              mode === m
                ? "bg-brand-500 text-white border-brand-500"
                : "text-gray-600 border-gray-300 hover:border-brand-500"
            )}
          >
            {m === "file" ? "Upload PDF" : "Paste Text"}
          </button>
        ))}
      </div>

      {/* Title + course */}
      <div className="grid grid-cols-2 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title (e.g. Week 3 Lecture)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Select course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code} — {c.course_name}
            </option>
          ))}
        </select>
      </div>

      {/* Drop or paste */}
      {mode === "file" ? (
        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-brand-500 bg-brand-50"
              : droppedFile
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-brand-500 hover:bg-gray-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-gray-500">
            {droppedFile ? (
              <>
                <StickyNote className="w-8 h-8 text-green-500" />
                <p className="font-medium text-green-700">{droppedFile.name}</p>
                <p className="text-xs">Click to change file</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-brand-500" />
                <p className="font-medium text-gray-700">Drop notes PDF</p>
                <p className="text-xs">or click to browse</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste your lecture notes, readings, or any text here…"
          rows={8}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
        {loading ? "Saving & embedding…" : "Save Note"}
      </button>

      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
