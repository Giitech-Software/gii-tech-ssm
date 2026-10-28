import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

export interface Exam {
  id: string;
  name: string;
  term?: string;
  classId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Fetch all exams (ordered by startDate or name)
 */
export const fetchExams = async (): Promise<Exam[]> => {
  try {
    const q = query(collection(db, "exams"), where("tenantId", "==", TENANT_ID));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })).sort((a, b) => String((a as Exam).name || "").localeCompare(String((b as Exam).name || ""))) as Exam[];
  } catch (error) {
    console.error("Error fetching exams:", error);
    return [];
  }
};

/**
 * Fetch exams filtered by classId (server-side)
 */
export const fetchExamsByClass = async (classId: string): Promise<Exam[]> => {
  if (!classId) return fetchExams(); // fallback if no class provided

  try {
    const q = query(
      collection(db, "exams"),
      where("tenantId", "==", TENANT_ID),
      where("classId", "==", classId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })).sort((a, b) => String((a as Exam).name || "").localeCompare(String((b as Exam).name || ""))) as Exam[];
  } catch (error) {
    console.error("Error fetching exams for class:", error);
    return [];
  }
};
