import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface ParentProfile {
  parentId?: string;
  userId?: string;
  displayName?: string;
  email?: string;
  studentIds?: string[];
}

export async function getParentProfileByUserId(userId: string): Promise<ParentProfile | null> {
  try {
    const profileSnapshot = await getDocs(query(collection(db, "parents"), where("userId", "==", userId), limit(1)));
    if (!profileSnapshot.empty) return profileSnapshot.docs[0].data() as ParentProfile;
    const legacySnapshot = await getDoc(doc(db, "parents", userId));
    return legacySnapshot.exists() ? (legacySnapshot.data() as ParentProfile) : null;
  } catch {
    return null;
  }
}
