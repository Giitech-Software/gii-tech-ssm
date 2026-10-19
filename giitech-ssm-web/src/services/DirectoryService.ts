import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

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
  collectionName: "teachers" | "staff";
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
  attendanceEnabled?: boolean;
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
  return mapDocs<StudentDirectoryRecord>(await getDocs(query(collection(db, "students"), where("tenantId", "==", TENANT_ID)))).filter(item => item.status !== "archived");
}

export async function fetchStaffDirectory(): Promise<StaffDirectoryRecord[]> {
  const [teachers, staff] = await Promise.all([getDocs(query(collection(db, "teachers"), where("tenantId", "==", TENANT_ID))), getDocs(query(collection(db, "staff"), where("tenantId", "==", TENANT_ID)))]);
  const records = [...mapDocs<StaffDirectoryRecord>(teachers).map(item => ({ ...item, collectionName: "teachers" as const })), ...mapDocs<StaffDirectoryRecord>(staff).map(item => ({ ...item, collectionName: "staff" as const, teacherId: item.teacherId || item.staffId || item.id }))];
  return [...new Map(records.map(item => [item.userId || item.id, item])).values()].filter(item => item.status !== "archived");
}

export async function fetchAcademicOptions() {
  const [departmentSnapshot, classSnapshot, streamSnapshot] = await Promise.all([
    getDocs(query(collection(db, "departments"), where("tenantId", "==", TENANT_ID))),
    getDocs(query(collection(db, "classes"), where("tenantId", "==", TENANT_ID))),
    getDocs(query(collection(db, "streams"), where("tenantId", "==", TENANT_ID))),
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

export async function graduateStudentClass(classId: string, graduationYear: string, archivedBy: string) {
  const students = (await getDocs(collection(db, "students"))).docs.filter((item) => {
    const data = item.data();
    return data.classId === classId && data.status !== "archived";
  });
  await Promise.all(students.map((student) => updateDoc(student.ref, {
    status: "archived",
    lifecycleStatus: "graduated",
    graduationClassId: classId,
    graduationYear,
    graduationArchivedAt: serverTimestamp(),
    graduationArchivedBy: archivedBy,
    updatedAt: serverTimestamp(),
  })));
  return students.length;
}

export async function updateStaffProfile(
  id: string,
  changes: Partial<StaffDirectoryRecord>
) {
  const profile = { ...changes };
  delete profile.id;
  const collectionName = profile.collectionName || "teachers";
  delete profile.collectionName;
  await updateDoc(doc(db, collectionName, id), { ...profile, updatedAt: serverTimestamp() });
}
