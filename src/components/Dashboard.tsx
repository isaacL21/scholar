"use client";

import { useMemo } from "react";
import { differenceInDays, parseISO, isValid } from "date-fns";
import clsx from "clsx";
import { Calendar, AlertCircle, Clock, BookOpen, FileText } from "lucide-react";
import { Deadline, Course, Note } from "@/lib/api";

interface Props {
  courses: Course[];
  deadlines: Deadline[];
  notes: Note[];
}

const TYPE_COLORS: Record<string, string> = {
  exam: "bg-red-100 text-red-700 border-red-200",
  assignment: "bg-blue-100 text-blue-700 border-blue-200",
  project: "bg-purple-100 text-purple-700 border-purple-200",
  quiz: "bg-amber-100 text-amber-700 border-amber-200",
};

function daysUntil(dateStr: string): number | null {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return null;
    return differenceInDays(d, new Date());
  } catch {
    return null;
  }
}

export default function Dashboard({ courses, deadlines, notes }: Props) {
  const sorted = useMemo(
    () =>
      [...deadlines]
        .map((d) => ({ ...d, daysLeft: daysUntil(d.date) }))
        .sort((a, b) => {
          if (a.daysLeft === null) return 1;
          if (b.daysLeft === null) return -1;
          return a.daysLeft - b.daysLeft;
        }),
    [deadlines]
  );

  const upcoming = sorted.filter((d) => d.daysLeft !== null && d.daysLeft >= 0).slice(0, 6);
  const overdue = sorted.filter((d) => d.daysLeft !== null && d.daysLeft < 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Courses", value: courses.length, icon: <BookOpen className="w-5 h-5 text-brand-500" /> },
          { label: "Deadlines", value: deadlines.length, icon: <Calendar className="w-5 h-5 text-purple-500" /> },
          { label: "Notes", value: notes.length, icon: <FileText className="w-5 h-5 text-green-500" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {overdue.length} overdue item{overdue.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {overdue.map((d) => d.title).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Upcoming Deadlines
        </h3>
        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            No upcoming deadlines — upload a syllabus to populate this.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border", TYPE_COLORS[d.type] ?? TYPE_COLORS.assignment)}>
                  {d.type}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                  <p className="text-xs text-gray-400">{d.course_name} · {d.date}</p>
                </div>
                <div className={clsx(
                  "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                  d.daysLeft === 0
                    ? "bg-red-100 text-red-700"
                    : d.daysLeft! <= 3
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                )}>
                  <Clock className="w-3 h-3" />
                  {d.daysLeft === 0 ? "Today" : `${d.daysLeft}d`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Courses list */}
      {courses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Your Courses
          </h3>
          <div className="space-y-2">
            {courses.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                    {c.course_code}
                  </span>
                  <p className="text-sm font-semibold text-gray-800">{c.course_name}</p>
                </div>
                <p className="text-xs text-gray-500 mb-2">{c.description}</p>
                <div className="flex flex-wrap gap-1">
                  {c.topics.slice(0, 6).map((t, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                  {c.topics.length > 6 && (
                    <span className="text-xs text-gray-400">+{c.topics.length - 6} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
