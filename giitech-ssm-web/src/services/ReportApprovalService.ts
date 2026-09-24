import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type ReportApproval = { studentId: string; academicYear: string; term: string; status: "draft" | "approved" | "reopened"; approvedBy?: string; approvedAt?: unknown; updatedAt?: unknown };
export const approvalId = (studentId: string, academicYear: string, term: string) => `${studentId}_${academicYear}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
export async function fetchReportApproval(studentId: string, academicYear: string, term: string) { const snapshot = await getDoc(doc(db, "reportApprovals", approvalId(studentId, academicYear, term))); return snapshot.exists() ? ({ studentId, academicYear, term, ...snapshot.data() } as ReportApproval) : { studentId, academicYear, term, status: "draft" as const }; }
export async function setReportApproval(studentId: string, academicYear: string, term: string, status: ReportApproval["status"], userId: string) { await setDoc(doc(db, "reportApprovals", approvalId(studentId, academicYear, term)), { studentId, academicYear, term, status, ...(status === "approved" ? { approvedBy: userId, approvedAt: serverTimestamp() } : {}), updatedAt: serverTimestamp() }, { merge: true }); }
export async function fetchApprovals() { const snapshot = await getDocs(collection(db, "reportApprovals")); return snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as ReportApproval & { id: string }); }
