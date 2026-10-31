import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";
export const mobileCommentId = (studentId: string, year: string, term: string) => `${studentId}_${year}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
export async function getMobileTermComments(studentId: string, year: string, term: string) { const snapshot = await getDoc(doc(db, "termComments", mobileCommentId(studentId, year, term))); return snapshot.exists() ? snapshot.data() : {}; }
export async function saveMobileTermComments(input: { studentId: string; academicYear: string; term: string; interests: string; conductRemark: string; attendanceRemark: string; nextSteps: string; strengths?: string; weaknesses?: string; interventions?: string; updatedBy: string }) { await setDoc(doc(db, "termComments", mobileCommentId(input.studentId, input.academicYear, input.term)), { ...input, tenantId: TENANT_ID, updatedAt: serverTimestamp() }, { merge: true }); }
