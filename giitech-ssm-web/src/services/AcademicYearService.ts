import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

export type AcademicTerm = {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  holidays?: string[];
};

const yearsCollection = collection(db, "academicYears");
const termsCollection = collection(db, "terms");

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const snapshot = await getDocs(query(yearsCollection, where("tenantId", "==", TENANT_ID)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AcademicYear));
}

export async function saveAcademicYear(value: Omit<AcademicYear, "id">, id?: string) {
  if (!value.name.trim() || !value.startDate || !value.endDate) throw new Error("Complete the academic year fields.");
  const yearId = id || value.name.trim().replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  await setDoc(doc(db, "academicYears", yearId), { ...value, name: value.name.trim(), tenantId: TENANT_ID, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteAcademicYear(id: string) {
  await deleteDoc(doc(db, "academicYears", id));
}

export async function getAcademicTerms(academicYearId: string): Promise<AcademicTerm[]> {
  const snapshot = await getDocs(query(termsCollection, where("tenantId", "==", TENANT_ID)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as AcademicTerm))
    .filter((item) => item.academicYearId === academicYearId);
}

export async function addAcademicTerm(value: Omit<AcademicTerm, "id">) {
  if (!value.name.trim() || !value.startDate || !value.endDate) throw new Error("Complete the term fields.");
  await addDoc(termsCollection, { ...value, name: value.name.trim(), tenantId: TENANT_ID, createdAt: serverTimestamp() });
}

export async function updateAcademicTerm(id: string, value: Omit<AcademicTerm, "id">) {
  await updateDoc(doc(db, "terms", id), { ...value, name: value.name.trim(), tenantId: TENANT_ID, updatedAt: serverTimestamp() });
}

export async function deleteAcademicTerm(id: string) {
  await deleteDoc(doc(db, "terms", id));
}
