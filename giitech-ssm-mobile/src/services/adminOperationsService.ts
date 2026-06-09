import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-operations";

export type AdminAttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string;
  status: "Present" | "Absent";
  pending: boolean;
};

export type PromotionHistoryRecord = {
  id: string;
  batchId: string;
  studentId: string;
  studentName: string;
  fromClassId: string;
  fromStreamId: string;
  toClassId: string;
  toStreamId: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  pending: boolean;
};

export type AdminOperationsData = {
  attendance: AdminAttendanceRecord[];
  promotions: PromotionHistoryRecord[];
  loadedAt: string;
  source: "live" | "cache";
};

function attendanceFromData(id: string, data: Record<string, unknown>, pending = false): AdminAttendanceRecord {
  const present = typeof data.present === "boolean" ? data.present : data.status === "Present";
  return {
    id,
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    classId: String(data.classId || ""),
    date: String(data.date || ""),
    status: present ? "Present" : "Absent",
    pending,
  };
}

function promotionFromData(id: string, data: Record<string, unknown>, pending = false): PromotionHistoryRecord {
  return {
    id,
    batchId: String(data.batchId || ""),
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    fromClassId: String(data.fromClassId || ""),
    fromStreamId: String(data.fromStreamId || ""),
    toClassId: String(data.toClassId || ""),
    toStreamId: String(data.toStreamId || ""),
    fromAcademicYear: String(data.fromAcademicYear || ""),
    toAcademicYear: String(data.toAcademicYear || ""),
    pending,
  };
}

function mergeQueue(data: AdminOperationsData, writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  const attendance = new Map(data.attendance.map((item) => [item.id, item]));
  const promotions = new Map(data.promotions.map((item) => [item.id, item]));
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("attendance/"))
    .forEach((write) => {
      const id = write.path.slice("attendance/".length);
      if (write.type === "delete") attendance.delete(id);
      else attendance.set(id, attendanceFromData(id, { ...(attendance.get(id) || {}), ...(write.data || {}) }, true));
    });
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("promotionHistory/"))
    .forEach((write) => {
      const id = write.path.slice("promotionHistory/".length);
      if (write.type === "delete") promotions.delete(id);
      else promotions.set(id, promotionFromData(id, { ...(promotions.get(id) || {}), ...(write.data || {}) }, true));
    });
  return {
    ...data,
    attendance: [...attendance.values()].sort((left, right) => right.date.localeCompare(left.date)),
    promotions: [...promotions.values()].reverse(),
  };
}

export async function fetchAdminOperations(userId: string): Promise<AdminOperationsData> {
  const cached = await readCachedData<AdminOperationsData | null>(CACHE_SCOPE, userId, null);
  const queue = await getQueuedWrites();
  try {
    const [attendanceSnapshot, promotionSnapshot] = await Promise.all([
      getDocs(collection(db, "attendance")),
      getDocs(collection(db, "promotionHistory")),
    ]);
    const result = mergeQueue(
      {
        attendance: attendanceSnapshot.docs.map((item) => attendanceFromData(item.id, item.data())),
        promotions: promotionSnapshot.docs.map((item) => promotionFromData(item.id, item.data())),
        loadedAt: new Date().toISOString(),
        source: "live",
      },
      queue,
      userId
    );
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...mergeQueue(cached, queue, userId), source: "cache" };
  }
}

export function attendanceSummary(records: AdminAttendanceRecord[]) {
  const summaries = new Map<string, { studentId: string; studentName: string; present: number; total: number; rate: number }>();
  records.forEach((record) => {
    const item = summaries.get(record.studentId) || { studentId: record.studentId, studentName: record.studentName, present: 0, total: 0, rate: 0 };
    item.total += 1;
    if (record.status === "Present") item.present += 1;
    item.rate = Math.round((item.present / item.total) * 100);
    summaries.set(record.studentId, item);
  });
  return [...summaries.values()].sort((left, right) => left.studentName.localeCompare(right.studentName));
}

export function promotionBatchId() {
  return `PROM-M-${Date.now().toString(36).toUpperCase()}`;
}

export function promotionDocumentId(batchId: string, studentId: string) {
  return `${batchId}_${encodeURIComponent(studentId).replaceAll("%", "_")}`;
}

export function nextAcademicYear() {
  const today = new Date();
  const start = today.getMonth() >= 7 ? today.getFullYear() + 1 : today.getFullYear();
  return `${start}/${start + 1}`;
}
