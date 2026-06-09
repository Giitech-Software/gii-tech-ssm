import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface StudentAcademicProfile {
  id: string;
  studentId: string;
  userId: string;
  displayName: string;
  email?: string;
  classId?: string;
  stream?: string;
}

export interface StudentGradeRecord {
  id: string;
  studentId: string;
  assignmentTitle?: string;
  className?: string;
  subject?: string;
  score?: number;
  mark?: number;
  total?: number;
  feedback?: string;
  teacherName?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  date: string;
  status: "Present" | "Absent";
  present: boolean;
  classId?: string;
  className?: string;
  teacherName?: string;
}

const chunkIds = (ids: string[]) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  return Array.from({ length: Math.ceil(uniqueIds.length / 10) }, (_, index) =>
    uniqueIds.slice(index * 10, index * 10 + 10)
  );
};

export async function fetchStudentProfileByUserId(userId: string): Promise<StudentAcademicProfile | null> {
  const studentQuery = query(collection(db, "students"), where("userId", "==", userId));
  const snapshot = await getDocs(studentQuery);
  if (snapshot.empty) return null;

  const profile = snapshot.docs[0];
  const data = profile.data();
  return {
    id: profile.id,
    studentId: data.studentId || profile.id,
    userId: data.userId || userId,
    displayName: data.displayName || data.name || data.studentName || "Student",
    email: data.email,
    classId: data.classId,
    stream: data.stream,
  };
}

export async function fetchGradesByStudentId(studentId: string): Promise<StudentGradeRecord[]> {
  const gradeQuery = query(collection(db, "grades"), where("studentId", "==", studentId));
  const snapshot = await getDocs(gradeQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as StudentGradeRecord[];
}

export async function fetchGradesByStudentIds(studentIds: string[]): Promise<StudentGradeRecord[]> {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(query(collection(db, "grades"), where("studentId", "in", ids)))
    )
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as StudentGradeRecord[]
  );
}

export async function fetchAttendanceByStudentId(studentId: string): Promise<StudentAttendanceRecord[]> {
  const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", studentId));
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      const present = typeof data.present === "boolean" ? data.present : data.status === "Present";
      return {
        id: item.id,
        ...data,
        studentId,
        present,
        status: present ? "Present" : "Absent",
      } as StudentAttendanceRecord;
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

export async function fetchAttendanceByStudentIds(studentIds: string[]): Promise<StudentAttendanceRecord[]> {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(query(collection(db, "attendance"), where("studentId", "in", ids)))
    )
  );
  return snapshots
    .flatMap((snapshot) =>
      snapshot.docs.map((item) => {
        const data = item.data();
        const present = typeof data.present === "boolean" ? data.present : data.status === "Present";
        return {
          id: item.id,
          ...data,
          present,
          status: present ? "Present" : "Absent",
        } as StudentAttendanceRecord;
      })
    )
    .sort((left, right) => right.date.localeCompare(left.date));
}

export async function fetchStudentProfilesByIds(studentIds: string[]): Promise<StudentAcademicProfile[]> {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(query(collection(db, "students"), where(documentId(), "in", ids)))
    )
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        studentId: data.studentId || item.id,
        userId: data.userId || "",
        displayName: data.displayName || data.name || data.studentName || "Student",
        email: data.email,
        classId: data.classId,
        stream: data.stream,
      };
    })
  );
}
