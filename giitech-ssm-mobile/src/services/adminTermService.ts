import { addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileTerm = { id: string; academicYearId: string; name: string; startDate: string; endDate: string };
export async function fetchTerms(academicYearId: string) { const snapshot = await getDocs(query(collection(db, "terms"), where("academicYearId", "==", academicYearId))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileTerm)); }
export async function createTerm(value: Omit<MobileTerm, "id">) { await addDoc(collection(db, "terms"), { ...value, createdAt: serverTimestamp() }); }
