import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type ClassSubjectSetup = { classId: string; subjects: string[]; updatedAt?: unknown; updatedBy?: string };

const clean = (subjects: string[]) => [...new Set(subjects.map(subject => subject.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export async function fetchClassSubjectSetup(classId: string): Promise<ClassSubjectSetup> {
  const snapshot = await getDoc(doc(db, "classSubjects", classId));
  return { classId, subjects: snapshot.exists() ? clean((snapshot.data().subjects as string[]) || []) : [] };
}

export async function saveClassSubjectSetup(classId: string, subjects: string[], updatedBy: string) {
  const normalized = clean(subjects);
  if (!classId) throw new Error("Class is required.");
  if (!normalized.length) throw new Error("Add at least one subject.");
  await setDoc(doc(db, "classSubjects", classId), { classId, subjects: normalized, updatedBy, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchAllClassSubjectSetups() {
  const snapshot = await getDocs(collection(db, "classSubjects"));
  return snapshot.docs.map(item => ({ classId: item.id, subjects: clean((item.data().subjects as string[]) || []) }));
}

export function missingRequiredSubjects(requiredSubjects: string[], recordedSubjects: string[]) {
  const recorded = new Set(recordedSubjects.map(subject => subject.trim().toLowerCase()));
  return requiredSubjects.filter(subject => !recorded.has(subject.toLowerCase()));
}
