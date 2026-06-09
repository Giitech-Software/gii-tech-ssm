import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  fetchRecentActivityLogs,
  type ActivityLogRecord,
} from "./ActivityLogService";
import {
  fetchAcademicOptions,
  fetchStaffDirectory,
  fetchStudentDirectory,
} from "./DirectoryService";
import {
  buildLedgerSummaries,
  fetchFeePayments,
  fetchStudentCharges,
} from "./FinanceService";
import { fetchParentDirectory } from "./IdentityLinkService";
import { fetchExamAssessments, fetchTerms } from "./AssessmentService";
import { fetchPublishedReports } from "./ReportPublicationService";

export interface AccountMetrics {
  total: number;
  admins: number;
  superadmins: number;
  teachers: number;
  students: number;
  parents: number;
}

export interface OperationalMetrics {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  totalParents: number;
  unresolvedStudentLinks: number;
  unlinkedParents: number;
  outstandingFees: number;
  studentsWithBalances: number;
  pendingSubmissions: number;
  releasedReports: number;
  attendanceTodayRecords: number;
  attendanceTodayRate: number;
  activeTerms: number;
  academicOptions: number;
  upcomingExams: number;
  accounts: AccountMetrics;
  recentActivity: ActivityLogRecord[];
  generatedAt: Date;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isPresent(record: Record<string, unknown>): boolean {
  return (
    record.present === true ||
    String(record.status ?? "").toLowerCase() === "present"
  );
}

async function loadMetric<T>(
  label: string,
  loader: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`Unable to load dashboard metric: ${label}`, error);
    return fallback;
  }
}

export async function fetchOperationalMetrics(): Promise<OperationalMetrics> {
  const today = getToday();
  const [
    students,
    staff,
    parents,
    charges,
    payments,
    reports,
    terms,
    academicOptions,
    exams,
    submissionSnapshot,
    attendanceSnapshot,
    userSnapshot,
    recentActivity,
  ] = await Promise.all([
    loadMetric("students", fetchStudentDirectory, []),
    loadMetric("staff", fetchStaffDirectory, []),
    loadMetric("parents", fetchParentDirectory, []),
    loadMetric("charges", fetchStudentCharges, []),
    loadMetric("payments", fetchFeePayments, []),
    loadMetric("reports", fetchPublishedReports, []),
    loadMetric("terms", fetchTerms, []),
    loadMetric("academic options", fetchAcademicOptions, {
      departments: [],
      classes: [],
      streams: [],
    }),
    loadMetric("exams", fetchExamAssessments, []),
    loadMetric(
      "submissions",
      async () => (await getDocs(collection(db, "submissions"))).docs.map((document) => document.data()),
      [],
    ),
    loadMetric(
      "attendance",
      async () => (await getDocs(collection(db, "attendance"))).docs.map((document) => document.data()),
      [],
    ),
    loadMetric(
      "accounts",
      async () => (await getDocs(collection(db, "users"))).docs.map((document) => document.data()),
      [],
    ),
    loadMetric("recent activity", () => fetchRecentActivityLogs(8), []),
  ]);

  const activeStudents = students.filter(
    (student) => String(student.status ?? "active").toLowerCase() === "active",
  );
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));
  const activeStudentIds = new Set(
    activeStudents.map((student) => student.studentId),
  );
  const unresolvedStudentLinks = activeStudents.filter((student) => {
    if (!student.parentId) return true;
    const parent = parentById.get(student.parentId);
    return !parent || !parent.studentIds?.includes(student.studentId);
  }).length;
  const unlinkedParents = parents.filter(
    (parent) =>
      !parent.studentIds?.some((studentId) => activeStudentIds.has(studentId)),
  ).length;

  const ledger = buildLedgerSummaries(charges, payments);
  const positiveBalances = ledger.filter((summary) => summary.balance > 0);
  const todayAttendance = attendanceSnapshot.filter((record) => record.date === today);
  const presentToday = todayAttendance.filter(isPresent).length;

  const accounts: AccountMetrics = {
    total: userSnapshot.length,
    admins: 0,
    superadmins: 0,
    teachers: 0,
    students: 0,
    parents: 0,
  };
  userSnapshot.forEach((document) => {
    const role = String(document.role ?? "").toLowerCase();
    if (role === "admin") accounts.admins += 1;
    if (role === "superadmin") accounts.superadmins += 1;
    if (role === "teacher") accounts.teachers += 1;
    if (role === "student") accounts.students += 1;
    if (role === "parent") accounts.parents += 1;
  });

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    totalStaff: staff.length,
    totalParents: parents.length,
    unresolvedStudentLinks,
    unlinkedParents,
    outstandingFees: positiveBalances.reduce(
      (total, summary) => total + summary.balance,
      0,
    ),
    studentsWithBalances: positiveBalances.length,
    pendingSubmissions: submissionSnapshot.filter(
      (document) =>
        String(document.status ?? "").toLowerCase() !== "graded",
    ).length,
    releasedReports: reports.length,
    attendanceTodayRecords: todayAttendance.length,
    attendanceTodayRate:
      todayAttendance.length === 0
        ? 0
        : Math.round((presentToday / todayAttendance.length) * 100),
    activeTerms: terms.filter(
      (term) => String(term.status ?? "").toLowerCase() === "active",
    ).length,
    academicOptions:
      academicOptions.departments.length +
      academicOptions.classes.length +
      academicOptions.streams.length,
    upcomingExams: exams.filter(
      (exam) => (exam.endDate || exam.startDate || "") >= today,
    ).length,
    accounts,
    recentActivity,
    generatedAt: new Date(),
  };
}
