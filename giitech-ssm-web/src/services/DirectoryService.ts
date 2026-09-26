import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type DirectoryStatus = "active" | "inactive" | "archived";

export interface StudentDirectoryRecord {
  id: string;
  studentId: string;
  userId?: string;
  displayName: string;
  email?: string;
  classId?: string;
  streamId?: string;
  stream?: string;
  departmentId?: string;
  department?: string;
  parentId?: string;
  gender?: string;
  dob?: string;
  admissionDate?: string;
  academicYear?: string;
  status?: DirectoryStatus;
}

export interface StaffDirectoryRecord {
  id: string;
  teacherId: string;
  staffId?: string;
  userId?: string;
  displayName: string;
  email?: string;
  departmentId?: string;
  department?: string;
  subject?: string;
  subjectId?: string;
  phone?: string;
  ssnitNumber?: string;
  status?: DirectoryStatus;
}

export interface AcademicOption {
  id: string;
  name: string;
  classId?: string;
  departmentId?: string;
  streamId?: string;
}

const mapDocs = <T,>(snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as T[];

export async function fetchStudentDirectory(): Promise<StudentDirectoryRecord[]> {
  return mapDocs<StudentDirectoryRecord>(await getDocs(collection(db, "students"))).filter(item => item.status !== "archived");
}

export async function fetchStaffDirectory(): Promise<StaffDirectoryRecord[]> {
  const [teachers, staff] = await Promise.all([getDocs(collection(db, "teachers")), getDocs(collection(db, "staff"))]);
  const records = [...mapDocs<StaffDirectoryRecord>(teachers), ...mapDocs<StaffDirectoryRecord>(staff).map(item => ({ ...item, teacherId: item.teacherId || item.staffId || item.id }))];
  return [...new Map(records.map(item => [item.userId || item.id, item])).values()].filter(item => item.status !== "archived");
}

export async function fetchAcademicOptions() {
  const [departmentSnapshot, classSnapshot, streamSnapshot] = await Promise.all([
    getDocs(collection(db, "departments")),
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "streams")),
  ]);

  return {
    departments: mapDocs<AcademicOption>(departmentSnapshot),
    classes: mapDocs<AcademicOption>(classSnapshot),
    streams: mapDocs<AcademicOption>(streamSnapshot),
  };
}

export async function updateStudentProfile(
  id: string,
  changes: Partial<StudentDirectoryRecord>
) {
  const profile = { ...changes };
  delete profile.id;
  await updateDoc(doc(db, "students", id), { ...profile, updatedAt: serverTimestamp() });
}

export async function updateStaffProfile(
  id: string,
  changes: Partial<StaffDirectoryRecord>
) {
  const profile = { ...changes };
  delete profile.id;
  await updateDoc(doc(db, "teachers", id), { ...profile, updatedAt: serverTimestamp() });
}
