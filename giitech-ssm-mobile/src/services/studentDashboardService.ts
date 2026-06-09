import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "student-dashboard";

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

export type StudentDashboardSummary = {
  studentId: string;
  displayName: string;
  classId: string;
  assignmentsDue: number;
  activeAssignments: number;
  submissions: number;
  grades: number;
  attendanceRate: number;
  attendanceRecords: number;
  loadedAt: string;
  source: "live" | "cache";
};

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const timestamp = value as TimestampLike;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000);

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isActiveAssignment(data: Record<string, unknown>) {
  const dueDate = asDate(data.dueDate);
  return !!dueDate && dueDate.getTime() >= Date.now();
}

export async function fetchStudentDashboardSummary(
  userId: string
): Promise<StudentDashboardSummary> {
  try {
    const studentSnapshot = await getDocs(
      query(collection(db, "students"), where("userId", "==", userId))
    );
    const studentDocument = studentSnapshot.docs[0];
    if (!studentDocument) throw new Error("Your student profile could not be found.");

    const student = studentDocument.data();
    const studentId = String(student.studentId || studentDocument.id);
    const classId = String(student.classId || "");

    const [assignmentSnapshot, gradeSnapshot, attendanceSnapshot, submissionSnapshot] =
      await Promise.all([
        classId
          ? getDocs(query(collection(db, "assignments"), where("classId", "==", classId)))
          : Promise.resolve(null),
        getDocs(query(collection(db, "grades"), where("studentId", "==", studentId))),
        getDocs(query(collection(db, "attendance"), where("studentId", "==", studentId))),
        getDocs(query(collection(db, "submissions"), where("studentUid", "==", userId))),
      ]);

    const activeAssignments =
      assignmentSnapshot?.docs.filter((item) => isActiveAssignment(item.data())) || [];
    const submittedAssignmentIds = new Set(
      submissionSnapshot.docs.map((item) => String(item.data().assignmentId || ""))
    );
    const presentDays = attendanceSnapshot.docs.filter((item) => {
      const attendance = item.data();
      return attendance.present === true || attendance.status === "Present";
    }).length;
    const attendanceRecords = attendanceSnapshot.size;

    const summary: StudentDashboardSummary = {
      studentId,
      displayName: String(student.displayName || "Student"),
      classId,
      assignmentsDue: activeAssignments.filter(
        (assignment) => !submittedAssignmentIds.has(assignment.id)
      ).length,
      activeAssignments: activeAssignments.length,
      submissions: submissionSnapshot.size,
      grades: gradeSnapshot.size,
      attendanceRate: attendanceRecords
        ? Math.round((presentDays / attendanceRecords) * 100)
        : 0,
      attendanceRecords,
      loadedAt: new Date().toISOString(),
      source: "live",
    };

    await writeCachedData(CACHE_SCOPE, userId, summary);
    return summary;
  } catch (error) {
    const cachedSummary = await readCachedData<StudentDashboardSummary | null>(
      CACHE_SCOPE,
      userId,
      null
    );
    if (cachedSummary) return { ...cachedSummary, source: "cache" };
    throw error;
  }
}
