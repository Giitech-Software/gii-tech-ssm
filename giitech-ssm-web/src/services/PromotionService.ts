import { collection, doc, getDocs, serverTimestamp, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { StudentDirectoryRecord } from "./DirectoryService";

export interface PromotionHistoryRecord {
  id: string;
  batchId: string;
  studentId: string;
  studentName: string;
  fromClassId?: string;
  fromStreamId?: string;
  toClassId: string;
  toStreamId?: string;
  fromAcademicYear?: string;
  toAcademicYear: string;
  promotedBy?: string;
  createdAt?: Timestamp | string;
}

export interface PromotionRequest {
  students: StudentDirectoryRecord[];
  toClassId: string;
  toStreamId?: string;
  toAcademicYear: string;
  promotedBy?: string;
}

export async function promoteStudents(request: PromotionRequest) {
  const batch = writeBatch(db);
  const batchId = `PROM-${Date.now().toString(36).toUpperCase()}`;

  request.students.forEach((student) => {
    batch.update(doc(db, "students", student.id), {
      classId: request.toClassId,
      streamId: request.toStreamId || "",
      stream: request.toStreamId || "",
      academicYear: request.toAcademicYear,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, "promotionHistory")), {
      batchId,
      studentId: student.studentId,
      studentName: student.displayName,
      fromClassId: student.classId || "",
      fromStreamId: student.streamId || student.stream || "",
      toClassId: request.toClassId,
      toStreamId: request.toStreamId || "",
      fromAcademicYear: student.academicYear || "",
      toAcademicYear: request.toAcademicYear,
      promotedBy: request.promotedBy || "",
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return { batchId, count: request.students.length };
}

export async function fetchPromotionHistory(): Promise<PromotionHistoryRecord[]> {
  const snapshot = await getDocs(collection(db, "promotionHistory"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as PromotionHistoryRecord)
    .sort((left, right) => {
      const toMillis = (value?: Timestamp | string) =>
        value instanceof Timestamp ? value.toMillis() : new Date(value || 0).getTime();
      return toMillis(right.createdAt) - toMillis(left.createdAt);
    });
}
