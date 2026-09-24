import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { fetchReportCardData } from "./ReportCardService";
import { fetchClassSubjectSetup, missingRequiredSubjects } from "./SubjectSetupService";
import { fetchReportApproval } from "./ReportApprovalService";

export interface PublishedSubject {
  name: string;
  mark: number;
  classScore?: number;
  examScore?: number;
  finalScore?: number;
  grade: string;
  remark: string;
}

export interface PublishedStudentReport {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  term: string;
  subjects: PublishedSubject[];
  averageGrade: number;
  gpa?: number;
  positions?: { class: { position: number; total: number } | null; stream: { position: number; total: number } | null; department: { position: number; total: number } | null; overall: { position: number; total: number } | null };
  interests?: string;
  conductRemark?: string;
  attendanceRemark?: string;
  nextSteps?: string;
  attendance: { present: number; total: number };
  published: boolean;
  approvalStatus?: "approved";
  publishedAt?: unknown;
  publishedBy?: string;
}

const reportId = (studentId: string, academicYear: string, term: string) =>
  `${studentId}_${academicYear}_${term}`.replace(/[^a-zA-Z0-9_-]+/g, "_");

export async function publishStudentReport(
  studentId: string,
  academicYear: string,
  term: string,
  publishedBy: string
) {
  const reportCard = await fetchReportCardData(studentId, { academicYear, term });
  if (!reportCard) throw new Error("Student record not found.");
  const approval = await fetchReportApproval(studentId, academicYear, term);
  if (approval.status !== "approved") throw new Error("Report must be approved and locked before publication.");
  if (!reportCard.subjects.length) throw new Error("No grades found for this student and term.");
  const studentSnapshot = await getDoc(doc(db, "students", studentId));
  const classId = studentSnapshot.exists() ? studentSnapshot.data().classId as string | undefined : undefined;
  if (classId) { const setup = await fetchClassSubjectSetup(classId); const missing = missingRequiredSubjects(setup.subjects, reportCard.subjects.map(subject => subject.name)); if (missing.length) throw new Error(`Cannot publish: missing subjects — ${missing.join(", ")}.`); }

  const report: Omit<PublishedStudentReport, "id"> = {
    studentId,
    studentName: reportCard.studentName,
    className: reportCard.className,
    academicYear,
    term,
    subjects: reportCard.subjects,
    averageGrade: reportCard.average,
    gpa: reportCard.gpa,
    positions: reportCard.positions,
    interests: reportCard.interests,
    conductRemark: reportCard.conductRemark,
    attendanceRemark: reportCard.attendanceRemark,
    nextSteps: reportCard.nextSteps,
    attendance: reportCard.attendance,
    published: true,
    approvalStatus: "approved",
    publishedBy,
  };

  await setDoc(
    doc(db, "studentReports", reportId(studentId, academicYear, term)),
    { ...report, publishedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function fetchPublishedReportsByStudentIds(studentIds: string[]) {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  const chunks = Array.from({ length: Math.ceil(uniqueIds.length / 10) }, (_, index) =>
    uniqueIds.slice(index * 10, index * 10 + 10)
  );
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(
        query(
          collection(db, "studentReports"),
          where("studentId", "in", ids),
          where("published", "==", true)
        )
      )
    )
  );
  return snapshots
    .flatMap((snapshot) =>
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PublishedStudentReport)
    )
    .sort((left, right) => `${right.academicYear}:${right.term}`.localeCompare(`${left.academicYear}:${left.term}`));
}

export async function fetchPublishedReports() {
  const snapshot = await getDocs(collection(db, "studentReports"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PublishedStudentReport);
}
