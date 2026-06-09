import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { readCachedData, writeCachedData } from "./offlineStore";

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

type StudentProfile = {
  studentId: string;
  classId: string;
  studentName: string;
};

const PROFILE_SCOPE = "student-profile";

export type CachedResult<T> = {
  data: T;
  loadedAt: string;
  source: "live" | "cache";
};

export type StudentAssignment = {
  id: string;
  classId: string;
  title: string;
  subject: string;
  description: string;
  type: string;
  questions: StudentAssignmentQuestion[];
  dueDate: string | null;
  status: "submitted" | "outstanding";
};

export type StudentAssignmentQuestion = {
  question: string;
  options: string[];
  answer: string;
};

export type StudentGrade = {
  id: string;
  title: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  feedback: string;
};

export type StudentAttendance = {
  id: string;
  date: string;
  status: "Present" | "Absent";
  className: string;
  teacherName: string;
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

export async function fetchStudentProfile(userId: string): Promise<StudentProfile> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "students"), where("userId", "==", userId))
    );
    const studentDocument = snapshot.docs[0];
    if (!studentDocument) throw new Error("Your student profile could not be found.");

    const student = studentDocument.data();
    const profile = {
      studentId: String(student.studentId || studentDocument.id),
      classId: String(student.classId || ""),
      studentName: String(student.displayName || student.studentName || "Student"),
    };
    await writeCachedData(PROFILE_SCOPE, userId, profile);
    return profile;
  } catch (error) {
    const cachedProfile = await readCachedData<StudentProfile | null>(PROFILE_SCOPE, userId, null);
    if (cachedProfile) return cachedProfile;
    throw error;
  }
}

async function withCache<T>(
  scope: string,
  userId: string,
  fetchLiveData: () => Promise<T>
): Promise<CachedResult<T>> {
  try {
    const result: CachedResult<T> = {
      data: await fetchLiveData(),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(scope, userId, result);
    return result;
  } catch (error) {
    const cachedResult = await readCachedData<CachedResult<T> | null>(scope, userId, null);
    if (cachedResult) return { ...cachedResult, source: "cache" };
    throw error;
  }
}

export function fetchStudentAssignments(userId: string) {
  return withCache<StudentAssignment[]>("student-assignments", userId, async () => {
    const student = await fetchStudentProfile(userId);
    if (!student.classId) return [];

    const [assignmentSnapshot, submissionSnapshot] = await Promise.all([
      getDocs(query(collection(db, "assignments"), where("classId", "==", student.classId))),
      getDocs(query(collection(db, "submissions"), where("studentUid", "==", userId))),
    ]);
    const submittedIds = new Set(
      submissionSnapshot.docs.map((item) => String(item.data().assignmentId || ""))
    );

    return assignmentSnapshot.docs
      .map((item) => {
        const assignment = item.data();
        return {
          id: item.id,
          classId: student.classId,
          title: String(assignment.title || "Untitled assignment"),
          subject: String(assignment.subject || "General"),
          description: String(assignment.description || ""),
          type: String(assignment.type || "assignment"),
          questions: Array.isArray(assignment.questions)
            ? assignment.questions.map((question) => ({
                question: String(question.question || "Untitled question"),
                options: Array.isArray(question.options)
                  ? question.options.map((option: unknown) => String(option))
                  : [],
                answer: String(question.answer || ""),
              }))
            : [],
          dueDate: asDate(assignment.dueDate)?.toISOString() || null,
          status: submittedIds.has(item.id) ? "submitted" : "outstanding",
        } satisfies StudentAssignment;
      })
      .sort((left, right) => {
        if (!left.dueDate) return 1;
        if (!right.dueDate) return -1;
        return left.dueDate.localeCompare(right.dueDate);
      });
  });
}

export function fetchStudentGrades(userId: string) {
  return withCache<StudentGrade[]>("student-grades", userId, async () => {
    const student = await fetchStudentProfile(userId);
    const snapshot = await getDocs(
      query(collection(db, "grades"), where("studentId", "==", student.studentId))
    );

    return snapshot.docs.map((item) => {
      const grade = item.data();
      const score = Number(grade.score ?? grade.mark ?? 0);
      const total = Number(grade.total || 100);
      return {
        id: item.id,
        title: String(grade.assignmentTitle || grade.subject || "Recorded grade"),
        subject: String(grade.subject || "General"),
        score,
        total,
        percentage: total ? Math.round((score / total) * 100) : 0,
        feedback: String(grade.feedback || ""),
      };
    });
  });
}

export function fetchStudentAttendance(userId: string) {
  return withCache<StudentAttendance[]>("student-attendance", userId, async () => {
    const student = await fetchStudentProfile(userId);
    const snapshot = await getDocs(
      query(collection(db, "attendance"), where("studentId", "==", student.studentId))
    );

    return snapshot.docs
      .map((item) => {
        const attendance = item.data();
        const present =
          typeof attendance.present === "boolean"
            ? attendance.present
            : attendance.status === "Present";
        return {
          id: item.id,
          date: String(attendance.date || ""),
          status: present ? "Present" : "Absent",
          className: String(attendance.className || attendance.classId || ""),
          teacherName: String(attendance.teacherName || ""),
        } satisfies StudentAttendance;
      })
      .sort((left, right) => right.date.localeCompare(left.date));
  });
}
