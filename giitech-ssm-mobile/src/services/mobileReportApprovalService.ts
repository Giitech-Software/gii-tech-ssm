import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./../firebaseConfig";
import { TENANT_ID } from "../config/tenant";
export const mobileApprovalId = (studentId: string, year: string, term: string) => `${studentId}_${year}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
export async function fetchMobileApprovals(year: string, term: string) { const snapshot = await getDocs(collection(db, "reportApprovals")); return new Map(snapshot.docs.filter(item => String(item.data().academicYear || "") === year && String(item.data().term || "") === term).map(item => [item.id, String(item.data().status || "draft")])); }
export async function setMobileApproval(studentId: string, year: string, term: string, status: "approved" | "reopened", userId: string) { await setDoc(doc(db, "reportApprovals", mobileApprovalId(studentId, year, term)), { tenantId: TENANT_ID, studentId, academicYear: year, term, status, ...(status === "approved" ? { approvedBy: userId, approvedAt: serverTimestamp() } : {}), updatedAt: serverTimestamp() }, { merge: true }); }
