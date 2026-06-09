// src/services/assignmentService.ts
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

/**
 * Assignment data model (matches Firestore)
 */
export interface Assignment {
  id?: string;
  title: string;
  description?: string;
  classId: string;
  subject?: string;
  teacherId?: string;
  academicYear?: string;
  term?: string;
  termId?: string;
  dueDate: any; // accepts Firestore Timestamp, string, or Date for backwards compatibility
  fileUrl?: string;

  /** 🔹 Type of assignment: short-answer | objective | essay */
  type?: "short-answer" | "objective" | "essay";

  /** 🔹 Questions with optional answers/options (for objective/short-answer) */
  questions?: { question: string; answer?: string; options?: string[] }[];

  createdAt?: any;
}

/**
 * Helper: map snapshot docs to Assignment[]
 */
const docsToAssignments = (snapshotDocs: any[]) =>
  snapshotDocs.map((d: any) => ({ id: d.id, ...(d.data ? d.data() : d) })) as Assignment[];

/**
 * 🔹 Fetch all assignments (admins/superadmins)
 */
export const fetchAssignments = async (): Promise<Assignment[]> => {
  try {
    const q = query(collection(db, "assignments"), orderBy("dueDate"));
    const snapshot = await getDocs(q);
    return docsToAssignments(snapshot.docs);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return [];
  }
};

/**
 * 🔹 Fetch assignments by class
 */
export const fetchAssignmentsByClass = async (
  classId: string
): Promise<Assignment[]> => {
  try {
    const q = query(
      collection(db, "assignments"),
      where("classId", "==", classId),
      orderBy("dueDate")
    );
    const snapshot = await getDocs(q);
    return docsToAssignments(snapshot.docs);
  } catch (error) {
    console.error("Error fetching class assignments:", error);
    return [];
  }
};

/**
 * 🔹 Fetch assignments created by the currently logged-in teacher
 */
export const fetchAssignmentsByTeacher = async (): Promise<Assignment[]> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.warn("fetchAssignmentsByTeacher: No user signed in");
      return [];
    }

    console.log("fetchAssignmentsByTeacher: fetching for uid:", user.uid);

    const preferredConstraints: QueryConstraint[] = [
      where("teacherId", "==", user.uid),
      orderBy("dueDate"),
    ];

    try {
      const qPreferred = query(collection(db, "assignments"), ...preferredConstraints);
      const snapshot = await getDocs(qPreferred);
      console.log("fetchAssignmentsByTeacher: preferred query succeeded, docs:", snapshot.size);
      return docsToAssignments(snapshot.docs);
    } catch (err) {
      console.warn(
        "fetchAssignmentsByTeacher: preferred query failed (likely mixed dueDate types). Falling back without orderBy.",
        err
      );
      const qFallback = query(collection(db, "assignments"), where("teacherId", "==", user.uid));
      const snapshot = await getDocs(qFallback);
      console.log("fetchAssignmentsByTeacher: fallback query docs:", snapshot.size);
      return docsToAssignments(snapshot.docs);
    }
  } catch (error) {
    console.error("Error fetching teacher assignments:", error);
    return [];
  }
};

/**
 * 🔹 Fetch assignments by any teacher ID (for Admins/SuperAdmins)
 */
export const fetchAssignmentsByTeacherId = async (
  teacherId: string
): Promise<Assignment[]> => {
  try {
    const q = query(
      collection(db, "assignments"),
      where("teacherId", "==", teacherId),
      orderBy("dueDate")
    );
    const snapshot = await getDocs(q);
    return docsToAssignments(snapshot.docs);
  } catch (error) {
    console.error("Error fetching assignments by teacher ID:", error);
    return [];
  }
};

/**
 * 🔹 Fetch assignments for a student (based on their classId)
 */
export const fetchAssignmentsByStudent = async (
  classId: string
): Promise<Assignment[]> => {
  try {
    const q = query(
      collection(db, "assignments"),
      where("classId", "==", classId),
      orderBy("dueDate")
    );
    const snapshot = await getDocs(q);
    return docsToAssignments(snapshot.docs);
  } catch (error) {
    console.error("Error fetching assignments for student:", error);
    return [];
  }
};

/**
 * 🔹 Add new assignment (auto-includes teacherId)
 *
 * Ensures dueDate is always stored as a Firestore Timestamp.
 */
export const addAssignment = async (data: Assignment): Promise<void> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // ✅ Normalize dueDate before saving
    if (data.dueDate) {
      if (typeof data.dueDate === "string") {
        data.dueDate = new Date(data.dueDate);
      }
      if (data.dueDate instanceof Date) {
        const { Timestamp } = await import("firebase/firestore");
        data.dueDate = Timestamp.fromDate(data.dueDate);
      }
    }

    await addDoc(collection(db, "assignments"), {
      ...data,
      teacherId: user.uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding assignment:", error);
    throw error;
  }
};

/**
 * 🔹 Update assignment
 *
 * Ensures dueDate stays a Firestore Timestamp on updates too.
 */
export const updateAssignment = async (
  id: string,
  data: Partial<Assignment>
): Promise<void> => {
  try {
    // ✅ Normalize dueDate before update
    if (data.dueDate) {
      if (typeof data.dueDate === "string") {
        data.dueDate = new Date(data.dueDate);
      }
      if (data.dueDate instanceof Date) {
        const { Timestamp } = await import("firebase/firestore");
        data.dueDate = Timestamp.fromDate(data.dueDate);
      }
    }

    const ref = doc(db, "assignments", id);
    await updateDoc(ref, data);
  } catch (error) {
    console.error("Error updating assignment:", error);
    throw error;
  }
};

/**
 * 🔹 Delete assignment
 */
export const deleteAssignment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "assignments", id));
  } catch (error) {
    console.error("Error deleting assignment:", error);
    throw error;
  }
};
