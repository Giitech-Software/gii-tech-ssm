import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { fetchAdminFamilyReports } from "./adminFamilyReportService";
import { fetchAdminFinance, buildLedgerSummaries, currency } from "./adminFinanceService";
import { fetchAdminOperations } from "./adminOperationsService";
import { fetchAdminDirectory, type AdminDashboardSummary } from "./adminService";
import { fetchParentData, parentAttendanceRate, parentOutstandingBalance } from "./parentDetailService";
import {
  fetchStudentAssignments,
  fetchStudentAttendance,
  fetchStudentGrades,
} from "./studentDetailService";
import {
  fetchTeacherAssignments,
  fetchTeacherClasses,
  fetchTeacherGradeSummary,
  fetchTeacherSubmissions,
  type TeacherDashboardSummary,
} from "./teacherService";

export type DashboardSource = "live" | "cache";

export type DashboardItem = {
  label: string;
  value: string | number;
  detail: string;
  route: string;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  detail: string;
};

export type AdminDashboardDetail = AdminDashboardSummary & {
  totalStudents: number;
  totalParents: number;
  outstandingFees: number;
  studentsWithBalances: number;
  attendanceTodayRecords: number;
  attendanceTodayRate: number;
  pendingSubmissions: number;
  releasedReports: number;
  unresolvedStudentLinks: number;
  unlinkedParents: number;
  upcomingExams: number;
  activeTerms: number;
  recentActivity: RecentActivityItem[];
};

export type TeacherDashboardDetail = TeacherDashboardSummary & {
  averageMark: number;
  gradedSubmissions: number;
  recentGrades: RecentActivityItem[];
  queue: DashboardItem[];
};

export type StudentDashboardDetail = {
  assignmentsDue: number;
  activeAssignments: number;
  submissions: number;
  grades: number;
  attendanceRate: number;
  attendanceRecords: number;
  nextWork: DashboardItem[];
  recentGrades: RecentActivityItem[];
  attendanceTrend: RecentActivityItem[];
  source: DashboardSource;
};

export type ParentDashboardDetail = {
  students: number;
  attendanceRate: number;
  reports: number;
  outstandingBalance: number;
  balances: DashboardItem[];
  recentGrades: RecentActivityItem[];
  recentReports: RecentActivityItem[];
  attendanceConcerns: RecentActivityItem[];
  source: DashboardSource;
};

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const timestamp = value as TimestampLike;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000);
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No date recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function sourceOf(...sources: DashboardSource[]) {
  return sources.includes("cache") ? "cache" : "live";
}

function rate(present: number, total: number) {
  return total ? Math.round((present / total) * 100) : 0;
}

export async function fetchAdminDashboardDetail(userId: string): Promise<AdminDashboardDetail> {
  const [directory, finance, operations, family, submissionsSnapshot, examsSnapshot, termsSnapshot, activitySnapshot] =
    await Promise.all([
      fetchAdminDirectory(userId),
      fetchAdminFinance(userId),
      fetchAdminOperations(userId),
      fetchAdminFamilyReports(userId),
      getDocs(collection(db, "submissions")),
      getDocs(collection(db, "exams")),
      getDocs(collection(db, "terms")),
      getDocs(collection(db, "activityLogs")),
    ]);

  const activeStudents = directory.data.students.filter((student) => student.status === "active");
  const parentById = new Map(family.parents.map((parent) => [parent.parentId || parent.id, parent]));
  const activeStudentIds = new Set(activeStudents.map((student) => student.studentId));
  const ledgers = buildLedgerSummaries(finance.charges, finance.payments);
  const positiveLedgers = ledgers.filter((ledger) => ledger.balance > 0);
  const today = todayKey();
  const todayAttendance = operations.attendance.filter((record) => record.date === today);
  const presentToday = todayAttendance.filter((record) => record.status === "Present").length;
  const exams = examsSnapshot.docs.map((item) => item.data());
  const terms = termsSnapshot.docs.map((item) => item.data());
  const submissions = submissionsSnapshot.docs.map((item) => item.data());

  const unresolvedStudentLinks = activeStudents.filter((student) => {
    if (!student.parentId) return true;
    const parent = parentById.get(student.parentId);
    return !parent || !parent.studentIds.includes(student.studentId);
  }).length;
  const unlinkedParents = family.parents.filter(
    (parent) => !parent.studentIds.some((studentId) => activeStudentIds.has(studentId))
  ).length;

  const recentActivity = activitySnapshot.docs
    .map((item) => {
      const data = item.data();
      const createdAt = asDate(data.createdAt);
      return {
        id: item.id,
        title: String(data.action || data.title || "Operational activity"),
        detail: `${String(data.userId || "System")} | ${createdAt ? createdAt.toLocaleString() : "Time not recorded"}`,
        createdAt: createdAt?.getTime() || 0,
      };
    })
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 5)
    .map(({ id, title, detail }) => ({ id, title, detail }));

  return {
    students: directory.data.students.length,
    activeStudents: activeStudents.length,
    staff: directory.data.staff.length,
    classes: directory.data.classes.length,
    totalStudents: directory.data.students.length,
    totalParents: family.parents.length,
    outstandingFees: positiveLedgers.reduce((total, ledger) => total + ledger.balance, 0),
    studentsWithBalances: positiveLedgers.length,
    attendanceTodayRecords: todayAttendance.length,
    attendanceTodayRate: rate(presentToday, todayAttendance.length),
    pendingSubmissions: submissions.filter((submission) => String(submission.status || "").toLowerCase() !== "graded").length,
    releasedReports: family.reports.filter((report) => report.published).length,
    unresolvedStudentLinks,
    unlinkedParents,
    upcomingExams: exams.filter((exam) => String(exam.endDate || exam.startDate || "") >= today).length,
    activeTerms: terms.filter((term) => String(term.status || "").toLowerCase() === "active").length,
    recentActivity,
    source: sourceOf(directory.source, finance.source, operations.source, family.source),
  };
}

export async function fetchTeacherDashboardDetail(userId: string): Promise<TeacherDashboardDetail> {
  const [assignmentsResult, classesResult, submissionsResult, gradesResult] = await Promise.all([
    fetchTeacherAssignments(userId),
    fetchTeacherClasses(userId),
    fetchTeacherSubmissions(userId),
    fetchTeacherGradeSummary(userId),
  ]);
  const assignments = assignmentsResult.data;
  const submissions = submissionsResult.data;
  const graded = submissions.filter((submission) => submission.status.toLowerCase() === "graded");
  const averageMark = graded.length
    ? Math.round(graded.reduce((total, submission) => total + (submission.score || 0), 0) / graded.length)
    : gradesResult.data.average;

  return {
    assignments: assignments.length,
    activeAssignments: assignments.filter(
      (assignment) => assignment.dueDate && new Date(assignment.dueDate).getTime() >= Date.now()
    ).length,
    pendingGrading: submissions.filter((submission) => submission.status.toLowerCase() !== "graded").length,
    classes: classesResult.data.length,
    averageMark,
    gradedSubmissions: graded.length,
    recentGrades: gradesResult.data.grades.slice(0, 4).map((grade) => ({
      id: grade.id,
      title: `${grade.studentName} | ${grade.score}%`,
      detail: `${grade.subject} | ${grade.className || grade.classId || "Class"}`,
    })),
    queue: [
      {
        label: "Submissions awaiting grading",
        value: submissions.filter((submission) => submission.status.toLowerCase() !== "graded").length,
        detail: "Review feedback and save durable grades.",
        route: "./teacher/submissions",
      },
      {
        label: "Attendance register",
        value: "Open",
        detail: "Record the daily class register.",
        route: "./teacher/attendance",
      },
      {
        label: "Exam grade entry",
        value: "Open",
        detail: "Enter marks for configured assessments.",
        route: "./teacher/exam-grades",
      },
      {
        label: "Messages",
        value: "Open",
        detail: "Continue family conversations.",
        route: "./teacher/messages",
      },
    ],
    source: sourceOf(assignmentsResult.source, classesResult.source, submissionsResult.source, gradesResult.source),
  };
}

export async function fetchStudentDashboardDetail(userId: string): Promise<StudentDashboardDetail> {
  const [assignmentsResult, gradesResult, attendanceResult] = await Promise.all([
    fetchStudentAssignments(userId),
    fetchStudentGrades(userId),
    fetchStudentAttendance(userId),
  ]);
  const activeAssignments = assignmentsResult.data.filter(
    (assignment) => assignment.dueDate && new Date(assignment.dueDate).getTime() >= Date.now()
  );
  const outstanding = activeAssignments.filter((assignment) => assignment.status === "outstanding");
  const present = attendanceResult.data.filter((record) => record.status === "Present").length;

  return {
    assignmentsDue: outstanding.length,
    activeAssignments: activeAssignments.length,
    submissions: assignmentsResult.data.filter((assignment) => assignment.status === "submitted").length,
    grades: gradesResult.data.length,
    attendanceRate: rate(present, attendanceResult.data.length),
    attendanceRecords: attendanceResult.data.length,
    nextWork: outstanding.slice(0, 5).map((assignment) => ({
      label: assignment.title,
      value: dateLabel(assignment.dueDate),
      detail: `${assignment.subject} | ${assignment.type}`,
      route: `./student/submission?assignmentId=${assignment.id}`,
    })),
    recentGrades: gradesResult.data.slice(0, 4).map((grade) => ({
      id: grade.id,
      title: `${grade.title} | ${grade.percentage}%`,
      detail: `${grade.subject}${grade.feedback ? ` | ${grade.feedback}` : ""}`,
    })),
    attendanceTrend: attendanceResult.data.slice(0, 4).map((record) => ({
      id: record.id,
      title: `${record.date || "Undated"} | ${record.status}`,
      detail: record.className || "Attendance record",
    })),
    source: sourceOf(assignmentsResult.source, gradesResult.source, attendanceResult.source),
  };
}

export async function fetchParentDashboardDetail(userId: string): Promise<ParentDashboardDetail> {
  const data = await fetchParentData(userId);
  const attendanceConcerns = data.attendance
    .filter((record) => record.status === "Absent")
    .slice(0, 4)
    .map((record) => ({
      id: record.id,
      title: `${record.studentName} | ${record.date || "Undated"}`,
      detail: "Marked absent",
    }));

  return {
    students: data.students.length,
    attendanceRate: parentAttendanceRate(data.attendance),
    reports: data.reports.length,
    outstandingBalance: parentOutstandingBalance(data.ledgers),
    balances: data.ledgers
      .filter((ledger) => ledger.balance > 0)
      .slice(0, 5)
      .map((ledger) => ({
        label: ledger.studentName,
        value: currency(ledger.balance),
        detail: `${ledger.studentId} | Paid ${currency(ledger.paid)}`,
        route: "./parent/fees",
      })),
    recentGrades: data.grades.slice(0, 4).map((grade) => ({
      id: grade.id,
      title: `${grade.studentName} | ${grade.percentage}%`,
      detail: `${grade.subject} | ${grade.title}`,
    })),
    recentReports: data.reports.slice(0, 4).map((report) => ({
      id: report.id,
      title: `${report.studentName} | ${report.averageGrade.toFixed(1)}%`,
      detail: `${report.term || "Term"} | ${report.academicYear || "Academic year"}`,
    })),
    attendanceConcerns,
    source: data.source,
  };
}
