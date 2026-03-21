// src/services/StreamService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { generateUserId } from "../utils/idGenerator";

export const fetchStreams = async () => {
  const snapshot = await getDocs(collection(db, "streams"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addStream = async (name: string, classId: string) => {
  if (!name.trim()) throw new Error("Stream name is required");

  const streamId = await generateUserId("stream");

  await setDoc(doc(db, "streams", streamId), {
    streamId,
    name,
    classId,
    createdAt: serverTimestamp(),
  });
};

export const deleteStream = async (streamId: string) => {
  await deleteDoc(doc(db, "streams", streamId));
};
