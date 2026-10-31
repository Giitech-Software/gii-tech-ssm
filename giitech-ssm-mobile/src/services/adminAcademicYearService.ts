import { addDoc, collection, getDocs, query, updateDoc, doc, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";
export type MobileAcademicYear = { id: string; name: string; startDate?: string; endDate?: string; active?: boolean };
export async function fetchAcademicYears() { const snapshot = await getDocs(query(collection(db, "academicYears"), where("tenantId", "==", TENANT_ID))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileAcademicYear)).sort((left, right) => String(right.startDate || "").localeCompare(String(left.startDate || ""))); }
export async function createAcademicYear(name: string, startDate: string, endDate: string) { await addDoc(collection(db, "academicYears"), { name, startDate, endDate, active: false, tenantId: TENANT_ID, createdAt: serverTimestamp() }); }
export async function activateAcademicYear(id: string, items: MobileAcademicYear[]) { await Promise.all(items.filter(item => item.active && item.id !== id).map(item => updateDoc(doc(db, "academicYears", item.id), { active: false, tenantId: TENANT_ID }))); await updateDoc(doc(db, "academicYears", id), { active: true, tenantId: TENANT_ID, updatedAt: serverTimestamp() }); }
