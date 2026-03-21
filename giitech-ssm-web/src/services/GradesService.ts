import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  total: number;
  assignmentId?: string;
  createdAt?: string;
}

export interface GradeSummary {
  studentName: string;
  className: string;
  average: number;
  highest: number;
  lowest: number;
}

/**
 * Fetches all grades and aggregates summaries
 * @param filter 'class' or 'student'
 */
export const getGradesSummary = async (
  filter: "class" | "student"
): Promise<GradeSummary[]> => {
  const gradesRef = collection(db, "grades");
  const snapshot = await getDocs(gradesRef);

  const grades: GradeRecord[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GradeRecord[];

  if (!grades.length) return [];

  const grouped: Record<string, GradeRecord[]> = {};

  // Group by either class or student
  grades.forEach((g) => {
    const key = filter === "class" ? g.className : g.studentName;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  // Compute summaries
  const summaries: GradeSummary[] = Object.entries(grouped).map(([key, group]) => {
    const scores = group.map((g) => (g.score / g.total) * 100);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      studentName: filter === "student" ? key : group[0].studentName,
      className: filter === "class" ? key : group[0].className,
      average: parseFloat(avg.toFixed(2)),
      highest: parseFloat(Math.max(...scores).toFixed(2)),
      lowest: parseFloat(Math.min(...scores).toFixed(2)),
    };
  });

  return summaries;
};

/**
 * Fetch all individual grades (for detail views)
 */
export const getAllGrades = async (): Promise<GradeRecord[]> => {
  const snapshot = await getDocs(collection(db, "grades"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GradeRecord[];
};
