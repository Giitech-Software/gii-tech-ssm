import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function fetchClassSubjects(classId: string) {
  const snapshot = await getDoc(doc(db, "classSubjectSetup", classId));
  return snapshot.exists() ? (snapshot.data().subjects as string[] || []) : [];
}

export async function saveClassSubjects(classId: string, subjects: string[], userId: string) {
  await setDoc(doc(db, "classSubjectSetup", classId), {
    classId,
    subjects,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
