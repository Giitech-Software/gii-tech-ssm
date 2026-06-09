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
  const profileQuery = query(
    collection(db, "parents"),
    where("userId", "==", userId),
    limit(1)
  );
  const profileSnapshot = await getDocs(profileQuery);

  if (!profileSnapshot.empty) {
    return profileSnapshot.docs[0].data() as ParentProfile;
  }

  // Supports any older records that were stored directly under the Auth UID.
  const legacySnapshot = await getDoc(doc(db, "parents", userId));
  return legacySnapshot.exists() ? (legacySnapshot.data() as ParentProfile) : null;
}
