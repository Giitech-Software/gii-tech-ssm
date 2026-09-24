import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type TermComments = { studentId: string; academicYear: string; term: string; interests: string; conductRemark: string; attendanceRemark: string; nextSteps: string; updatedBy?: string; updatedAt?: unknown };
export const termCommentsId = (studentId: string, academicYear: string, term: string) => `${studentId}_${academicYear}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
export async function fetchTermComments(studentId: string, academicYear: string, term: string): Promise<TermComments | null> { const snapshot = await getDoc(doc(db, "termComments", termCommentsId(studentId, academicYear, term))); return snapshot.exists() ? ({ studentId, academicYear, term, interests: "", conductRemark: "", attendanceRemark: "", nextSteps: "", ...snapshot.data() } as TermComments) : null; }
export async function saveTermComments(input: Omit<TermComments, "updatedAt">) { await setDoc(doc(db, "termComments", termCommentsId(input.studentId, input.academicYear, input.term)), { ...input, updatedAt: serverTimestamp() }, { merge: true }); }
export async function fetchTermCommentsForStudents(studentIds: string[], academicYear: string, term: string) { const results = await Promise.all(studentIds.map(studentId => fetchTermComments(studentId, academicYear, term))); return results.filter(Boolean) as TermComments[]; }
