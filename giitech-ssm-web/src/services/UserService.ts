import { collection, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface UserRecord {
  uid: string;
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt?: string | Date;
  status?: "active" | "disabled";
  locked?: boolean;
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

export async function updateUserSecurity(uid: string, changes: { status?: "active" | "disabled"; locked?: boolean }) {
  await updateDoc(doc(db, "users", uid), { ...changes, securityUpdatedAt: serverTimestamp() });
}
