// src/services/StreamService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { generateUserId } from "../utils/idGenerator";
import { TENANT_ID } from "../config/tenant";

export const fetchStreams = async () => {
  const snapshot = await getDocs(query(collection(db, "streams"), where("tenantId", "==", TENANT_ID)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addStream = async (name: string, classId: string) => {
  if (!name.trim()) throw new Error("Stream name is required");

  const streamId = await generateUserId("stream");

  await setDoc(doc(db, "streams", streamId), {
    streamId,
    name,
    classId,
    tenantId: TENANT_ID,
    createdAt: serverTimestamp(),
  });
};

export const deleteStream = async (streamId: string) => {
  await deleteDoc(doc(db, "streams", streamId));
};
