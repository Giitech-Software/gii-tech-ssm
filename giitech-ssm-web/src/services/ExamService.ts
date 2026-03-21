import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";

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
    const q = query(collection(db, "exams"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Exam[];
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
      where("classId", "==", classId),
      orderBy("name")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Exam[];
  } catch (error) {
    console.error("Error fetching exams for class:", error);
    return [];
  }
};
