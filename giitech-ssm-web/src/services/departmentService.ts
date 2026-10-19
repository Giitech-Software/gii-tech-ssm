import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { generateDepartmentId } from "../utils/idGenerator";
import { TENANT_ID } from "../config/tenant";

const DEPARTMENTS_COLLECTION = "departments";

export const getDepartments = async () => {
  const snapshot = await getDocs(query(collection(db, DEPARTMENTS_COLLECTION), where("tenantId", "==", TENANT_ID)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addDepartment = async (name: string, head: string) => {
  if (!name.trim()) throw new Error("Department name is required");

  const newId = await generateDepartmentId();

  await setDoc(doc(db, DEPARTMENTS_COLLECTION, newId), {
    id: newId,
    name,
    head,
    tenantId: TENANT_ID,
    createdAt: serverTimestamp(),
  });
};

export const updateDepartment = async (id: string, name: string, head: string) => {
  const ref = doc(db, DEPARTMENTS_COLLECTION, id);
  await updateDoc(ref, { name, head, tenantId: TENANT_ID });
};

export const deleteDepartment = async (id: string) => {
  const ref = doc(db, DEPARTMENTS_COLLECTION, id);
  await deleteDoc(ref);
};
