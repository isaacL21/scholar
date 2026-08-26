import axios from "axios";

// On Vercel, call Railway backend directly. Locally, use the Next.js proxy.
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : "/api/backend";

const api = axios.create({ baseURL: backendUrl });

export interface Course {
  id: string;
  course_name: string;
  course_code: string;
  instructor: string;
  topics: string[];
  deadlines: Deadline[];
  description: string;
  filename: string;
}

export interface Deadline {
  id: string;
  title: string;
  date: string;
  type: "exam" | "assignment" | "project" | "quiz";
  course_id: string;
  course_name: string;
}

export interface Note {
  id: string;
  title: string;
  course_id: string;
  preview: string;
}

export const uploadSyllabus = async (file: File): Promise<{ course: Course }> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/syllabi/upload", form);
  return res.data;
};

export const uploadNote = async (
  params: { file?: File; text?: string; title: string; course_id: string }
): Promise<{ note: Note }> => {
  const form = new FormData();
  form.append("title", params.title);
  form.append("course_id", params.course_id);
  if (params.file) form.append("file", params.file);
  if (params.text) form.append("text", params.text);
  const res = await api.post("/notes/upload", form);
  return res.data;
};

export const getCourses = async (): Promise<Course[]> => {
  const res = await api.get("/courses");
  return res.data;
};

export const getDeadlines = async (): Promise<Deadline[]> => {
  const res = await api.get("/deadlines");
  return res.data;
};

export const getNotes = async (): Promise<Note[]> => {
  const res = await api.get("/notes");
  return res.data;
};

export const askTutor = async (params: {
  question: string;
  course_id?: string;
  mode: "tutor" | "quiz" | "studyguide" | "explain";
}): Promise<{ response: string; sources_used: number }> => {
  const res = await api.post("/tutor/ask", params);
  return res.data;
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  await api.delete(`/courses/${courseId}`);
};
