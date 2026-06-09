import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-assessments";

export type TermStatus = "planned" | "active" | "closed";

export type AcademicTerm = {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
  pending: boolean;
};

export type ExamAssessment = {
  id: string;
  name: string;
  classId: string;
  termId: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  pending: boolean;
};

export type AdminAssessmentData = {
  terms: AcademicTerm[];
  exams: ExamAssessment[];
  loadedAt: string;
  source: "live" | "cache";
};

function termStatus(value: unknown): TermStatus {
  return value === "active" || value === "closed" ? value : "planned";
}

function termFromData(id: string, data: Record<string, unknown>, pending = false): AcademicTerm {
  return {
    id,
    name: String(data.name || "Academic term"),
    academicYear: String(data.academicYear || ""),
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
    status: termStatus(data.status),
    pending,
  };
}

function examFromData(id: string, data: Record<string, unknown>, pending = false): ExamAssessment {
  return {
    id,
    name: String(data.name || "Exam assessment"),
    classId: String(data.classId || ""),
    termId: String(data.termId || ""),
    term: String(data.term || ""),
    academicYear: String(data.academicYear || ""),
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
    pending,
  };
}

function mergeQueue(data: AdminAssessmentData, writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  const terms = new Map(data.terms.map((item) => [item.id, item]));
  const exams = new Map(data.exams.map((item) => [item.id, item]));
  writes.filter((write) => write.ownerUid === userId && write.path.startsWith("terms/")).forEach((write) => {
    const id = write.path.slice("terms/".length);
    if (write.type === "delete") terms.delete(id);
    else terms.set(id, termFromData(id, { ...(terms.get(id) || {}), ...(write.data || {}) }, true));
  });
  writes.filter((write) => write.ownerUid === userId && write.path.startsWith("exams/")).forEach((write) => {
    const id = write.path.slice("exams/".length);
    if (write.type === "delete") exams.delete(id);
    else exams.set(id, examFromData(id, { ...(exams.get(id) || {}), ...(write.data || {}) }, true));
  });
  return {
    ...data,
    terms: [...terms.values()].sort((left, right) => right.startDate.localeCompare(left.startDate)),
    exams: [...exams.values()].sort((left, right) => right.startDate.localeCompare(left.startDate)),
  };
}

export async function fetchAdminAssessments(userId: string): Promise<AdminAssessmentData> {
  const cached = await readCachedData<AdminAssessmentData | null>(CACHE_SCOPE, userId, null);
  const writes = await getQueuedWrites();
  try {
    const [terms, exams] = await Promise.all([
      getDocs(collection(db, "terms")),
      getDocs(collection(db, "exams")),
    ]);
    const result = mergeQueue({
      terms: terms.docs.map((item) => termFromData(item.id, item.data())),
      exams: exams.docs.map((item) => examFromData(item.id, item.data())),
      loadedAt: new Date().toISOString(),
      source: "live",
    }, writes, userId);
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...mergeQueue(cached, writes, userId), source: "cache" };
  }
}

export function assessmentDocumentId(prefix: "TERM" | "EXAM") {
  return `${prefix}-M-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function currentAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}
