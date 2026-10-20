// services/classService.ts
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  generateClassId,
  generateStreamId,
} from "../utils/idGenerator";
import { TENANT_ID } from "../config/tenant";

/**
 * ✅ Fetch all classes with their department names and streams
 */
export const fetchClasses = async () => {
  const snapshot = await getDocs(query(collection(db, "classes"), where("tenantId", "==", TENANT_ID)));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

/**
 * ✅ Add a new class under a department
 */
export const addClass = async (
  name: string,
  departmentId: string,
  departmentName: string
) => {
  if (!name.trim()) throw new Error("Class name is required");

  const classId = await generateClassId();

  await setDoc(doc(db, "classes", classId), {
    classId,
    name,
    departmentId,
    departmentName,
    createdAt: serverTimestamp(),
    streams: [],
    tenantId: TENANT_ID,
  });
};

/**
 * ✅ Add a stream under a specific class
 */
export const addStream = async (classId: string, streamName: string) => {
  if (!streamName.trim()) throw new Error("Stream name is required");

  const streamId = await generateStreamId();
  const classRef = doc(db, "classes", classId);
  const classSnap = await getDoc(classRef);

  if (!classSnap.exists()) throw new Error("Class not found");

  const classData = classSnap.data();
  const updatedStreams = [
    ...(classData.streams || []),
    { streamId, name: streamName },
  ];

  await setDoc(classRef, { ...classData, streams: updatedStreams }, { merge: true });
};

/**
 * ✅ Delete a class by ID
 */
export const deleteClass = async (classId: string) => {
  await deleteDoc(doc(db, "classes", classId));
};
