"use client";

import { useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Bot, BookOpen, ListChecks, Lightbulb, HelpCircle } from "lucide-react";
import { askTutor, Course } from "@/lib/api";

interface Props {
  courses: Course[];
}

type Mode = "tutor" | "quiz" | "studyguide" | "explain";

const MODES: { id: Mode; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "tutor", label: "Ask", icon: <Bot className="w-4 h-4" />, hint: "Ask anything about your notes or course topics" },
  { id: "quiz", label: "Quiz Me", icon: <HelpCircle className="w-4 h-4" />, hint: "Generate practice questions from your notes" },
  { id: "studyguide", label: "Study Guide", icon: <ListChecks className="w-4 h-4" />, hint: "Build a structured study guide from your notes" },
  { id: "explain", label: "Explain", icon: <Lightbulb className="w-4 h-4" />, hint: "Get a simple, intuitive explanation of any concept" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: number;
}

export default function AiTutor({ courses }: Props) {
  const [mode, setMode] = useState<Mode>("tutor");
  const [courseId, setCourseId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await askTutor({
        question: q,
        course_id: courseId || undefined,
        mode,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, sources: data.sources_used },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Check that the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Mode pills */}
        <div className="flex gap-1.5 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                mode === m.id
                  ? "bg-brand-500 text-white border-brand-500"
                  : "text-gray-600 border-gray-300 hover:border-brand-500"
              )}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {/* Course filter */}
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="ml-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code}
            </option>
          ))}
        </select>
      </div>

      {/* Chat window */}
      <div className="flex-1 min-h-[340px] max-h-[480px] overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 py-8">
            <BookOpen className="w-10 h-10 text-brand-500 opacity-60" />
            <div>
              <p className="font-medium text-gray-600">Scholar AI Tutor</p>
              <p className="text-sm mt-1">{currentMode.hint}</p>
              {courses.length === 0 && (
                <p className="text-xs mt-3 text-amber-600">
                  Upload a syllabus first so Scholar knows your course topics!
                </p>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-brand-500 text-white rounded-tr-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.sources !== undefined && (
                    <p className="text-xs text-gray-400 mt-2 not-prose">
                      {msg.sources} context chunk{msg.sources !== 1 ? "s" : ""} retrieved
                    </p>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            Scholar is thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={currentMode.hint + "…"}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
