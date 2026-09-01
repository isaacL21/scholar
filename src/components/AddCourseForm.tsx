"use client";

import { useState } from "react";
import { PlusCircle, Loader2, X } from "lucide-react";
import { createCourse, Course } from "@/lib/api";

interface Props {
  onCreated: (course: Course) => void;
}

export default function AddCourseForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    course_name: "",
    course_code: "",
    instructor: "",
    description: "",
    topics: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.course_name.trim() || !form.course_code.trim()) {
      return setError("Course name and code are required.");
    }
    setLoading(true);
    setError(null);
    try {
      const data = await createCourse({
        course_name: form.course_name,
        course_code: form.course_code.toUpperCase(),
        instructor: form.instructor,
        description: form.description,
        topics: form.topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onCreated(data.course);
      setForm({ course_name: "", course_code: "", instructor: "", description: "", topics: "" });
      setOpen(false);
    } catch {
      setError("Failed to create course.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-brand-500 text-brand-500 rounded-xl hover:bg-brand-50 transition-colors text-sm font-medium w-full justify-center"
      >
        <PlusCircle className="w-4 h-4" />
        Add Course Manually
      </button>
    );
  }

  return (
    <div className="border border-brand-500 rounded-xl p-5 bg-brand-50 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Add Course Manually</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Course Name *</label>
          <input
            value={form.course_name}
            onChange={(e) => set("course_name", e.target.value)}
            placeholder="Corporate Finance"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Course Code *</label>
          <input
            value={form.course_code}
            onChange={(e) => set("course_code", e.target.value)}
            placeholder="FIN 3220"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Instructor</label>
          <input
            value={form.instructor}
            onChange={(e) => set("instructor", e.target.value)}
            placeholder="Dr. Smith"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Topics (comma separated)</label>
          <input
            value={form.topics}
            onChange={(e) => set("topics", e.target.value)}
            placeholder="Valuation, DCF, Capital Structure"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Brief course description..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
        {loading ? "Creating..." : "Create Course"}
      </button>
    </div>
  );
}
