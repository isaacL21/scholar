"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { uploadSyllabus, Course } from "@/lib/api";

interface Props {
  onUploaded: (course: Course) => void;
}

export default function SyllabusDropzone({ onUploaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      const file = accepted[0];
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await uploadSyllabus(file);
        setSuccess(`✓ Parsed: ${data.course.course_name}`);
        onUploaded(data.course);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 hover:border-brand-500 hover:bg-gray-50",
          loading && "opacity-60 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-gray-500">
          {loading ? (
            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          ) : (
            <UploadCloud className="w-10 h-10 text-brand-500" />
          )}
          <div>
            <p className="font-semibold text-gray-700">
              {loading ? "Parsing syllabus with Claude…" : "Drop your syllabus PDF here"}
            </p>
            <p className="text-sm mt-1">
              {loading ? "Extracting topics, deadlines, and course info" : "or click to browse • PDF only"}
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <FileText className="w-4 h-4 flex-shrink-0" />
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
