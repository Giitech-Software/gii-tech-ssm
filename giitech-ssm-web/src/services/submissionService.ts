// src/services/submissionService.ts
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

export interface Submission {
  id?: string;
  assignmentId: string;
  studentUid?: string; // auth.uid
  studentId?: string;  // school-specific ID
  studentName?: string;
  classId?: string;
  submissionUrl?: string;
  fileUrl?: string;
  submittedAt?: any;
  answers?: string[];
  responses?: any[];
   responseText?: string; // ✔️ ESSAY RESPONSE FIELD
  score?: number;
  grade?: string;
  feedback?: string;
  createdAt?: any;
}

/**
 * 🔹 Fetch submissions for a specific assignment
 */
export const fetchSubmissionsByAssignment = async (
  assignmentId: string
): Promise<Submission[]> => {
  try {
    const q = query(collection(db, "submissions"), where("assignmentId", "==", assignmentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data() as Submission;
      return {
        id: d.id,
        ...data,
        fileUrl: data.submissionUrl || data.fileUrl,
      };
    });
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("🚫 Permission denied while fetching submissions:", error);
    } else {
      console.error("🔥 Error fetching submissions by assignment:", error);
    }
    return [];
  }
};

/**
 * 🔹 Fetch submissions created by the logged-in student
 */
export const fetchStudentSubmissions = async (): Promise<Submission[]> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const qByUid = query(collection(db, "submissions"), where("studentUid", "==", user.uid));
    const snapByUid = await getDocs(qByUid);
    if (!snapByUid.empty) {
      return snapByUid.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) }));
    }

    // Fallback for old schema (studentId instead of studentUid)
    try {
      const studentQ = query(collection(db, "students"), where("userId", "==", user.uid));
      const studentSnap = await getDocs(studentQ);
      if (!studentSnap.empty) {
        const studentData = studentSnap.docs[0].data() as any;
        const schoolStudentId = studentData.studentId;
        if (schoolStudentId) {
          const qBySchoolId = query(
            collection(db, "submissions"),
            where("studentId", "==", schoolStudentId)
          );
          const snapBySchoolId = await getDocs(qBySchoolId);
          return snapBySchoolId.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) }));
        }
      }
    } catch (fallbackErr) {
      console.warn("fetchStudentSubmissions: fallback by studentId failed:", fallbackErr);
    }

    return [];
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("🚫 Permission denied while fetching student submissions:", error);
    } else {
      console.error("🔥 Error fetching student submissions:", error);
    }
    return [];
  }
};

/**
 * 🔹 Add new submission (student)
 */
export const addSubmission = async (data: Submission): Promise<void> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    let schoolStudentId = data.studentId;
    try {
      if (!schoolStudentId) {
        const studentQ = query(collection(db, "students"), where("userId", "==", user.uid));
        const studentSnap = await getDocs(studentQ);
        if (!studentSnap.empty) {
          const s = studentSnap.docs[0].data() as any;
          schoolStudentId = s.studentId || schoolStudentId;
        }
      }
    } catch (err) {
      console.warn("addSubmission: could not look up studentId fallback:", err);
    }

    const payload: any = {
      ...data,
      studentUid: user.uid,
      studentId: schoolStudentId || data.studentId || null,
      submissionUrl: data.submissionUrl || data.fileUrl || "",
      submittedAt: data.submittedAt || serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "submissions"), payload);
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("🚫 Permission denied while adding submission:", error);
    } else {
      console.error("🔥 Error adding submission:", error);
    }
    throw error;
  }
};

/**
 * 🔹 Update submission (teacher/admin)
 */
export const updateSubmission = async (id: string, data: Partial<Submission>): Promise<void> => {
  try {
    const ref = doc(db, "submissions", id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("🚫 Permission denied while updating submission:", error);
    } else {
      console.error("🔥 Error updating submission:", error);
    }
    throw error;
  }
};

/**
 * 🔹 Delete submission (admin only)
 */
export const deleteSubmission = async (id: string): Promise<void> => {
  try {
    const ref = doc(db, "submissions", id);
    await deleteDoc(ref);
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("🚫 Permission denied while deleting submission:", error);
    } else {
      console.error("🔥 Error deleting submission:", error);
    }
    throw error;
  }
};
