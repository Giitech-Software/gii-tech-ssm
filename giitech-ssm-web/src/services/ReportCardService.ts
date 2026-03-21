import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/**
 * Fetch a student's complete report card data (with mock fallbacks)
 */
export const fetchReportCardData = async (studentId: string) => {
  try {
    // --- 1. Fetch student details ---
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (!studentDoc.exists()) {
      console.warn("Student not found:", studentId);
      return getMockReportCard("Unknown Student");
    }

    const studentData = studentDoc.data();
    const classId = studentData.classId ?? null;
    const termId = studentData.termId ?? "term1";

    // --- 2. Fetch class name ---
    let className = "Unassigned Class";
    if (classId) {
      const classDoc = await getDoc(doc(db, "classes", classId));
      if (classDoc.exists()) className = classDoc.data().name || className;
    }

    // --- 3. Fetch term name ---
    let termName = "Term 1";
    if (termId) {
      const termDoc = await getDoc(doc(db, "terms", termId));
      if (termDoc.exists()) termName = termDoc.data().name || termName;
    }

    // --- 4. Fetch exam results for student ---
    const examQuery = query(
      collection(db, "exams"),
      where("studentId", "==", studentId)
    );
    const examSnap = await getDocs(examQuery);

    const subjects: any[] = [];
    let totalMarks = 0;

    examSnap.forEach((d) => {
      const data = d.data();
      subjects.push({
        name: data.subjectName || "Unknown Subject",
        mark: data.mark ?? 0,
        grade: getGrade(data.mark ?? 0),
        remark: getRemark(data.mark ?? 0),
      });
      totalMarks += data.mark ?? 0;
    });

    // ✅ Mock fallback if no exams exist
    if (subjects.length === 0) {
      console.warn("No exam records found — using mock data");
      subjects.push(
        { name: "Mathematics", mark: 78, grade: "B", remark: "Very Good" },
        { name: "English", mark: 85, grade: "A", remark: "Excellent" },
        { name: "Science", mark: 69, grade: "C", remark: "Good" }
      );
      totalMarks = subjects.reduce((sum, s) => sum + s.mark, 0);
    }

    const average = subjects.length > 0 ? totalMarks / subjects.length : 0;

    // --- 5. Fetch attendance data ---
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId)
    );
    const attendanceSnap = await getDocs(attendanceQuery);

    let totalDays = 0;
    let presentDays = 0;
    attendanceSnap.forEach((d) => {
      const data = d.data();
      totalDays++;
      if (data.status === "Present") presentDays++;
    });

    // ✅ Mock fallback if no attendance
    if (totalDays === 0) {
      totalDays = 50;
      presentDays = 45;
    }

    // --- 6. Final formatted result ---
    return {
      studentName: studentData.name || "Unknown",
      className,
      termName,
      subjects,
      average,
      attendance: {
        present: presentDays,
        total: totalDays,
      },
    };
  } catch (error) {
    console.error("Error fetching report card:", error);
    return getMockReportCard("Error Student");
  }
};

/**
 * Grade logic
 */
function getGrade(mark: number): string {
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  if (mark >= 40) return "E";
  return "F";
}

/**
 * Remark logic
 */
function getRemark(mark: number): string {
  if (mark >= 80) return "Excellent";
  if (mark >= 70) return "Very Good";
  if (mark >= 60) return "Good";
  if (mark >= 50) return "Fair";
  if (mark >= 40) return "Needs Improvement";
  return "Fail";
}

/**
 * Default mock report for missing data
 */
function getMockReportCard(name: string) {
  return {
    studentName: name,
    className: "Demo Class",
    termName: "First Term",
    subjects: [
      { name: "Math", mark: 82, grade: "A", remark: "Excellent" },
      { name: "English", mark: 75, grade: "B", remark: "Very Good" },
      { name: "Science", mark: 65, grade: "C", remark: "Good" },
    ],
    average: 74,
    attendance: {
      present: 45,
      total: 50,
    },
  };
}
