import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface ReportCardFilters {
  academicYear?: string;
  term?: string;
}

export const fetchReportCardData = async (studentId: string, filters: ReportCardFilters = {}) => {
  const studentDoc = await getDoc(doc(db, "students", studentId));
  if (!studentDoc.exists()) {
    console.warn("Student not found:", studentId);
    return null;
  }

  const studentData = studentDoc.data();
  const classId = studentData.classId ?? null;
  let className = "Unassigned Class";
  if (classId) {
    const classDoc = await getDoc(doc(db, "classes", classId));
    if (classDoc.exists()) className = classDoc.data().name || className;
  }

  const termName = filters.term || "All terms";

  const gradeConstraints: QueryConstraint[] = [where("studentId", "==", studentId)];
  if (filters.academicYear) gradeConstraints.push(where("academicYear", "==", filters.academicYear));
  if (filters.term) gradeConstraints.push(where("term", "==", filters.term));
  const gradeQuery = query(collection(db, "grades"), ...gradeConstraints);
  const gradeSnapshot = await getDocs(gradeQuery);
  let totalMarks = 0;
  const subjects = gradeSnapshot.docs.map((item) => {
    const grade = item.data();
    const mark = Number(grade.mark ?? grade.score ?? 0);
    totalMarks += mark;
    return {
      name: grade.subject || grade.subjectName || grade.assignmentTitle || "Unknown Subject",
      mark,
      grade: getGrade(mark),
      remark: getRemark(mark),
    };
  });

  const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", studentId));
  const attendanceSnapshot = await getDocs(attendanceQuery);
  const presentDays = attendanceSnapshot.docs.filter((item) => {
    const attendance = item.data();
    return attendance.present === true || attendance.status === "Present";
  }).length;

  return {
    studentName: studentData.displayName || studentData.name || studentData.studentName || "Unknown",
    className,
    termName,
    academicYear: filters.academicYear || "All academic years",
    subjects,
    average: subjects.length ? totalMarks / subjects.length : 0,
    attendance: {
      present: presentDays,
      total: attendanceSnapshot.size,
    },
  };
};

function getGrade(mark: number): string {
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  if (mark >= 40) return "E";
  return "F";
}

function getRemark(mark: number): string {
  if (mark >= 80) return "Excellent";
  if (mark >= 70) return "Very Good";
  if (mark >= 60) return "Good";
  if (mark >= 50) return "Fair";
  if (mark >= 40) return "Needs Improvement";
  return "Fail";
}
