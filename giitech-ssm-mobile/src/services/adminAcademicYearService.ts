import { addDoc, collection, getDocs, query, orderBy, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileAcademicYear = { id: string; name: string; startDate?: string; endDate?: string; active?: boolean };
export async function fetchAcademicYears() { const snapshot = await getDocs(query(collection(db, "academicYears"), orderBy("startDate", "desc"))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileAcademicYear)); }
export async function createAcademicYear(name: string, startDate: string, endDate: string) { await addDoc(collection(db, "academicYears"), { name, startDate, endDate, active: false, createdAt: serverTimestamp() }); }
export async function activateAcademicYear(id: string, items: MobileAcademicYear[]) { await Promise.all(items.filter(item => item.active && item.id !== id).map(item => updateDoc(doc(db, "academicYears", item.id), { active: false }))); await updateDoc(doc(db, "academicYears", id), { active: true, updatedAt: serverTimestamp() }); }
