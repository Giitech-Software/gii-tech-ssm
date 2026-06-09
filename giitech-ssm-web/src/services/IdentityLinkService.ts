import { arrayRemove, arrayUnion, collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { StudentDirectoryRecord } from "./DirectoryService";

export interface ParentDirectoryRecord {
  id: string;
  parentId: string;
  userId?: string;
  displayName: string;
  email?: string;
  studentIds: string[];
}

export async function fetchParentDirectory(): Promise<ParentDirectoryRecord[]> {
  const snapshot = await getDocs(collection(db, "parents"));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        parentId: data.parentId || item.id,
        userId: data.userId,
        displayName: data.displayName || data.name || "Parent",
        email: data.email,
        studentIds: data.studentIds || [],
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function linkStudentToParent(
  student: StudentDirectoryRecord,
  parent: ParentDirectoryRecord,
  previousParent?: ParentDirectoryRecord
) {
  const studentId = student.studentId || student.id;
  const batch = writeBatch(db);
  batch.update(doc(db, "students", student.id), {
    parentId: parent.parentId,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "parents", parent.id), {
    studentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp(),
  });
  if (previousParent && previousParent.parentId !== parent.parentId) {
    batch.update(doc(db, "parents", previousParent.id), {
      studentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function unlinkStudentFromParent(student: StudentDirectoryRecord, parent: ParentDirectoryRecord) {
  const studentId = student.studentId || student.id;
  const batch = writeBatch(db);
  batch.update(doc(db, "students", student.id), {
    parentId: "",
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "parents", parent.id), {
    studentIds: arrayRemove(studentId),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
