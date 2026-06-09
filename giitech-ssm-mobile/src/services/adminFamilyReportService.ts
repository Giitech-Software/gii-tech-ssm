import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { AcademicOption, StudentDirectoryRecord } from "./adminService";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-family-reports";

export type ParentDirectoryRecord = {
  id: string;
  parentId: string;
  displayName: string;
  email: string;
  studentIds: string[];
  pending: boolean;
};

type RawRecord = Record<string, unknown> & { id: string };

export type PublishedReport = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  term: string;
  subjects: { name: string; mark: number; grade: string; remark: string }[];
  averageGrade: number;
  attendance: { present: number; total: number };
  published: boolean;
  pending: boolean;
};

export type AdminFamilyReportData = {
  parents: ParentDirectoryRecord[];
  grades: RawRecord[];
  attendance: RawRecord[];
  reports: PublishedReport[];
  loadedAt: string;
  source: "live" | "cache";
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function parentFromData(id: string, data: Record<string, unknown>, pending = false): ParentDirectoryRecord {
  return { id, parentId: String(data.parentId || id), displayName: String(data.displayName || data.name || "Parent"), email: String(data.email || ""), studentIds: Array.isArray(data.studentIds) ? data.studentIds.map(String) : [], pending };
}

function reportFromData(id: string, data: Record<string, unknown>, pending = false): PublishedReport {
  const attendance = asRecord(data.attendance);
  return { id, studentId: String(data.studentId || ""), studentName: String(data.studentName || "Student"), className: String(data.className || "Unassigned Class"), academicYear: String(data.academicYear || ""), term: String(data.term || ""), subjects: Array.isArray(data.subjects) ? data.subjects.map((item) => { const subject = asRecord(item); return { name: String(subject.name || "Subject"), mark: Number(subject.mark) || 0, grade: String(subject.grade || ""), remark: String(subject.remark || "") }; }) : [], averageGrade: Number(data.averageGrade) || 0, attendance: { present: Number(attendance.present) || 0, total: Number(attendance.total) || 0 }, published: data.published !== false, pending };
}

function overlay(data: AdminFamilyReportData, writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  const parents = new Map(data.parents.map((item) => [item.id, item]));
  const reports = new Map(data.reports.map((item) => [item.id, item]));
  writes.filter((write) => write.ownerUid === userId && write.path.startsWith("parents/")).forEach((write) => {
    const id = write.path.slice("parents/".length);
    if (write.type === "delete") parents.delete(id);
    else parents.set(id, parentFromData(id, { ...(parents.get(id) || {}), ...(write.data || {}) }, true));
  });
  writes.filter((write) => write.ownerUid === userId && write.path.startsWith("studentReports/")).forEach((write) => {
    const id = write.path.slice("studentReports/".length);
    if (write.type === "delete") reports.delete(id);
    else reports.set(id, reportFromData(id, { ...(reports.get(id) || {}), ...(write.data || {}) }, true));
  });
  return { ...data, parents: [...parents.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)), reports: [...reports.values()].sort((left, right) => `${right.academicYear}:${right.term}`.localeCompare(`${left.academicYear}:${left.term}`)) };
}

export async function fetchAdminFamilyReports(userId: string): Promise<AdminFamilyReportData> {
  const cached = await readCachedData<AdminFamilyReportData | null>(CACHE_SCOPE, userId, null);
  const writes = await getQueuedWrites();
  try {
    const [parents, grades, attendance, reports] = await Promise.all([getDocs(collection(db, "parents")), getDocs(collection(db, "grades")), getDocs(collection(db, "attendance")), getDocs(collection(db, "studentReports"))]);
    const result = overlay({ parents: parents.docs.map((item) => parentFromData(item.id, item.data())), grades: grades.docs.map((item) => ({ id: item.id, ...item.data() })), attendance: attendance.docs.map((item) => ({ id: item.id, ...item.data() })), reports: reports.docs.map((item) => reportFromData(item.id, item.data())), loadedAt: new Date().toISOString(), source: "live" }, writes, userId);
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...overlay(cached, writes, userId), source: "cache" };
  }
}

function grade(mark: number) { return mark >= 80 ? "A" : mark >= 70 ? "B" : mark >= 60 ? "C" : mark >= 50 ? "D" : mark >= 40 ? "E" : "F"; }
function remark(mark: number) { return mark >= 80 ? "Excellent" : mark >= 70 ? "Very Good" : mark >= 60 ? "Good" : mark >= 50 ? "Fair" : mark >= 40 ? "Needs Improvement" : "Fail"; }

export function buildPublishedReport(student: StudentDirectoryRecord, classes: AcademicOption[], data: AdminFamilyReportData, academicYear: string, term: string): Omit<PublishedReport, "id" | "pending"> {
  const grades = data.grades.filter((item) => String(item.studentId || "") === student.studentId && String(item.academicYear || "") === academicYear && String(item.term || "") === term);
  if (!grades.length) throw new Error("No grades found for this student and term.");
  const subjects = grades.map((item) => { const mark = Number(item.mark ?? item.score ?? 0); return { name: String(item.subject || item.subjectName || item.assignmentTitle || "Unknown Subject"), mark, grade: grade(mark), remark: remark(mark) }; });
  const attendance = data.attendance.filter((item) => String(item.studentId || "") === student.studentId);
  return { studentId: student.studentId, studentName: student.displayName, className: classes.find((item) => (item.classId || item.id) === student.classId)?.name || "Unassigned Class", academicYear, term, subjects, averageGrade: subjects.reduce((total, item) => total + item.mark, 0) / subjects.length, attendance: { present: attendance.filter((item) => item.present === true || item.status === "Present").length, total: attendance.length }, published: true };
}

export function reportDocumentId(studentId: string, academicYear: string, term: string) {
  return `${studentId}_${academicYear}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

export function currentAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}
