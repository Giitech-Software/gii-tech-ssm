// src/services/PerformanceService.ts
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Fetch performance data for a class and exam.
 * Optionally filters by a specific studentId.
 */
export const fetchPerformanceData = async (
  classId: string,
  examId: string,
  studentId?: string | null
) => {
  try {
    let q = query(
      collection(db, "grades"),
      where("classId", "==", classId),
      where("examId", "==", examId)
    );

    if (studentId) {
      q = query(
        collection(db, "grades"),
        where("classId", "==", classId),
        where("examId", "==", examId),
        where("studentId", "==", studentId)
      );
    }

    const snapshot = await getDocs(q);
    const records: any[] = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      records.push({
        id: doc.id,
        studentId: d.studentId,
        studentName: d.studentName || "Unknown",
        classId: d.classId,
        subject: d.subject,
        mark: d.mark,
        examId: d.examId,
      });
    });

    // Compute average marks per student
    const grouped: Record<string, { total: number; count: number }> = {};

    for (const r of records) {
      if (!grouped[r.studentId]) grouped[r.studentId] = { total: 0, count: 0 };
      grouped[r.studentId].total += r.mark;
      grouped[r.studentId].count += 1;
    }

    const withAverages = records.map((r) => ({
      ...r,
      average: grouped[r.studentId]
        ? (grouped[r.studentId].total / grouped[r.studentId].count).toFixed(2)
        : "N/A",
    }));

    return withAverages;
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return [];
  }
};
