import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

export type DirectoryStatus = "active" | "inactive" | "archived";

export type AdminResult<T> = {
  data: T;
  loadedAt: string;
  source: "live" | "cache";
};

export type AcademicOption = {
  id: string;
  name: string;
  classId: string;
  streamId: string;
  departmentId: string;
  departmentName: string;
  head: string;
  pending: boolean;
};

export type StudentDirectoryRecord = {
  id: string;
  studentId: string;
  displayName: string;
  email: string;
  classId: string;
  streamId: string;
  academicYear: string;
  parentId: string;
  gender: string;
  status: DirectoryStatus;
  pending: boolean;
};

export type StaffDirectoryRecord = {
  id: string;
  teacherId: string;
  displayName: string;
  email: string;
  departmentId: string;
  subject: string;
  phone: string;
  status: DirectoryStatus;
  pending: boolean;
};

export type AdminDirectoryData = {
  students: StudentDirectoryRecord[];
  staff: StaffDirectoryRecord[];
  departments: AcademicOption[];
  classes: AcademicOption[];
  streams: AcademicOption[];
};

export type AdminDashboardSummary = {
  students: number;
  activeStudents: number;
  staff: number;
  classes: number;
  source: "live" | "cache";
};

function asStatus(value: unknown): DirectoryStatus {
  return value === "inactive" || value === "archived" ? value : "active";
}

function studentFromData(id: string, data: Record<string, unknown>, pending = false): StudentDirectoryRecord {
  return {
    id,
    studentId: String(data.studentId || id),
    displayName: String(data.displayName || data.studentName || data.name || "Student"),
    email: String(data.email || ""),
    classId: String(data.classId || ""),
    streamId: String(data.streamId || data.stream || ""),
    academicYear: String(data.academicYear || ""),
    parentId: String(data.parentId || ""),
    gender: String(data.gender || ""),
    status: asStatus(data.status),
    pending,
  };
}

function staffFromData(id: string, data: Record<string, unknown>, pending = false): StaffDirectoryRecord {
  return {
    id,
    teacherId: String(data.teacherId || id),
    displayName: String(data.displayName || data.name || "Staff member"),
    email: String(data.email || ""),
    departmentId: String(data.departmentId || data.department || ""),
    subject: String(data.subject || data.subjectId || ""),
    phone: String(data.phone || ""),
    status: asStatus(data.status),
    pending,
  };
}

function optionFromData(id: string, data: Record<string, unknown>): AcademicOption {
  return {
    id,
    name: String(data.name || data.classId || data.streamId || id),
    classId: String(data.classId || ""),
    streamId: String(data.streamId || ""),
    departmentId: String(data.departmentId || ""),
    departmentName: String(data.departmentName || ""),
    head: String(data.head || ""),
    pending: data.pending === true,
  };
}

function mergeQueuedOptions(
  records: Map<string, AcademicOption>,
  collectionName: "departments" | "classes" | "streams",
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith(`${collectionName}/`))
    .forEach((write) => {
      const id = write.path.slice(collectionName.length + 1);
      if (write.type === "delete") {
        records.delete(id);
        return;
      }
      records.set(id, optionFromData(id, { ...(records.get(id) || {}), ...(write.data || {}), pending: true }));
    });
}

function mergeQueuedProfiles<T extends { id: string }>(
  records: Map<string, T>,
  collectionName: "students" | "teachers",
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string,
  fromData: (id: string, data: Record<string, unknown>, pending: boolean) => T
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith(`${collectionName}/`))
    .forEach((write) => {
      const id = write.path.slice(collectionName.length + 1);
      if (write.type === "delete") {
        records.delete(id);
        return;
      }
      records.set(id, fromData(id, { ...(records.get(id) || {}), ...(write.data || {}) }, true));
    });
}

export async function fetchAdminDirectory(userId: string): Promise<AdminResult<AdminDirectoryData>> {
  const cached = await readCachedData<AdminResult<AdminDirectoryData> | null>("admin-directory", userId, null);
  const queue = await getQueuedWrites();

  try {
    const [studentSnapshot, staffSnapshot, departmentSnapshot, classSnapshot, streamSnapshot] =
      await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "teachers")),
        getDocs(collection(db, "departments")),
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "streams")),
      ]);
    const students = new Map(
      studentSnapshot.docs.map((item) => [item.id, studentFromData(item.id, item.data())])
    );
    const staff = new Map(
      staffSnapshot.docs.map((item) => [item.id, staffFromData(item.id, item.data())])
    );
    const departments = new Map(
      departmentSnapshot.docs.map((item) => [item.id, optionFromData(item.id, item.data())])
    );
    const classes = new Map(
      classSnapshot.docs.map((item) => [item.id, optionFromData(item.id, item.data())])
    );
    const streams = new Map(
      streamSnapshot.docs.map((item) => [item.id, optionFromData(item.id, item.data())])
    );
    mergeQueuedProfiles(students, "students", queue, userId, studentFromData);
    mergeQueuedProfiles(staff, "teachers", queue, userId, staffFromData);
    mergeQueuedOptions(departments, "departments", queue, userId);
    mergeQueuedOptions(classes, "classes", queue, userId);
    mergeQueuedOptions(streams, "streams", queue, userId);

    const result: AdminResult<AdminDirectoryData> = {
      data: {
        students: [...students.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
        staff: [...staff.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
        departments: [...departments.values()].sort((left, right) => left.name.localeCompare(right.name)),
        classes: [...classes.values()].sort((left, right) => left.name.localeCompare(right.name)),
        streams: [...streams.values()].sort((left, right) => left.name.localeCompare(right.name)),
      },
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData("admin-directory", userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    const students = new Map(cached.data.students.map((student) => [student.id, student]));
    const staff = new Map(cached.data.staff.map((member) => [member.id, member]));
    const departments = new Map(cached.data.departments.map((item) => [item.id, item]));
    const classes = new Map(cached.data.classes.map((item) => [item.id, item]));
    const streams = new Map(cached.data.streams.map((item) => [item.id, item]));
    mergeQueuedProfiles(students, "students", queue, userId, studentFromData);
    mergeQueuedProfiles(staff, "teachers", queue, userId, staffFromData);
    mergeQueuedOptions(departments, "departments", queue, userId);
    mergeQueuedOptions(classes, "classes", queue, userId);
    mergeQueuedOptions(streams, "streams", queue, userId);
    return {
      ...cached,
      data: {
        ...cached.data,
        students: [...students.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
        staff: [...staff.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
        departments: [...departments.values()].sort((left, right) => left.name.localeCompare(right.name)),
        classes: [...classes.values()].sort((left, right) => left.name.localeCompare(right.name)),
        streams: [...streams.values()].sort((left, right) => left.name.localeCompare(right.name)),
      },
      source: "cache",
    };
  }
}

export async function fetchAdminDashboardSummary(userId: string): Promise<AdminDashboardSummary> {
  const result = await fetchAdminDirectory(userId);
  return {
    students: result.data.students.length,
    activeStudents: result.data.students.filter((student) => student.status === "active").length,
    staff: result.data.staff.length,
    classes: result.data.classes.length,
    source: result.source,
  };
}

export function classNameFor(options: AcademicOption[], classId: string) {
  return options.find((item) => (item.classId || item.id) === classId)?.name || classId || "Unassigned";
}

export function departmentNameFor(options: AcademicOption[], departmentId: string) {
  return options.find((item) => item.id === departmentId)?.name || departmentId || "Unassigned";
}

export function academicDocumentId(prefix: "DEPT" | "CLS" | "STR") {
  return `${prefix}-M-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
