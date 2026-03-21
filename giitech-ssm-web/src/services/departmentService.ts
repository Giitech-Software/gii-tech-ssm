import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { generateDepartmentId } from "../utils/idGenerator";

const DEPARTMENTS_COLLECTION = "departments";

export const getDepartments = async () => {
  const snapshot = await getDocs(collection(db, DEPARTMENTS_COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addDepartment = async (name: string, head: string) => {
  if (!name.trim()) throw new Error("Department name is required");

  const newId = await generateDepartmentId();

  await setDoc(doc(db, DEPARTMENTS_COLLECTION, newId), {
    id: newId,
    name,
    head,
    createdAt: serverTimestamp(),
  });
};

export const updateDepartment = async (id: string, name: string, head: string) => {
  const ref = doc(db, DEPARTMENTS_COLLECTION, id);
  await updateDoc(ref, { name, head });
};

export const deleteDepartment = async (id: string) => {
  const ref = doc(db, DEPARTMENTS_COLLECTION, id);
  await deleteDoc(ref);
};
