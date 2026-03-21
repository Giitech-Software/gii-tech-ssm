import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface UserRecord {
  uid: string;
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt?: string | Date;
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
  })) as UserRecord[];
}

export async function deleteUser(uid: string) {
  await deleteDoc(doc(db, "users", uid));
}
