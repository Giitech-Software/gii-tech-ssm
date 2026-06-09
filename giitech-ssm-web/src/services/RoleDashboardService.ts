import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  fetchAttendanceByStudentId,
  fetchAttendanceByStudentIds,
  fetchGradesByStudentId,
  fetchGradesByStudentIds,
  fetchStudentProfileByUserId,
  fetchStudentProfilesByIds,
} from "./AcademicRecordService";
import {
  buildLedgerSummaries,
  fetchFeePaymentsByStudentIds,
  fetchStudentChargesByStudentIds,
} from "./FinanceService";
import { fetchNotificationsForUser, type WorkflowNotification } from "./NotificationService";
import { getParentProfileByUserId } from "./ParentService";
import { fetchPublishedReportsByStudentIds } from "./ReportPublicationService";
import { fetchAssignmentsByClass, fetchAssignmentsByTeacher, type Assignment } from "./assignmentService";

export interface RoleDashboardMetric {
  label: string;
  value: string | number;
  detail: string;
}

export interface RoleDashboardQueue {
  label: string;
  detail: string;
  value: string | number;
  route: string;
}

export interface RoleDashboardLink {
  label: string;
  detail: string;
  route: string;
}

export interface RoleDashboardData {
  name: string;
  context: string;
  metrics: RoleDashboardMetric[];
  queues: RoleDashboardQueue[];
  links: RoleDashboardLink[];
  notifications: WorkflowNotification[];
}

function asDate(value: Assignment["dueDate"]): Date | null {
  if (!value) return null;
  const parsed = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isActive(assignment: Assignment) {
  const deadline = asDate(assignment.dueDate);
  return !!deadline && deadline.getTime() >= Date.now();
}

function attendanceRate(records: Array<{ present: boolean }>) {
  if (!records.length) return 0;
  return Math.round((records.filter((record) => record.present).length / records.length) * 100);
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(value);

export async function fetchTeacherDashboard(userId: string): Promise<RoleDashboardData> {
  const [assignments, submissionSnapshot, notifications] = await Promise.all([
    fetchAssignmentsByTeacher(),
    getDocs(collection(db, "submissions")),
    fetchNotificationsForUser({ userId, role: "teacher" }),
  ]);
  const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
  const submissions = submissionSnapshot.docs
    .map((item) => item.data())
    .filter((submission) => assignmentIds.has(submission.assignmentId));
  const pending = submissions.filter((submission) => String(submission.status || "").toLowerCase() !== "graded");
  const graded = submissions.filter((submission) => String(submission.status || "").toLowerCase() === "graded");
  const average = graded.length
    ? Math.round(graded.reduce((sum, submission) => sum + Number(submission.grade || submission.score || 0), 0) / graded.length)
    : 0;

  return {
    name: "Teacher workspace",
    context: "Stay ahead of grading, attendance, and assessment responsibilities.",
    metrics: [
      { label: "Active assignments", value: assignments.filter(isActive).length, detail: `${assignments.length} assignments total` },
      { label: "Pending grading", value: pending.length, detail: `${graded.length} submissions graded` },
      { label: "Average mark", value: `${average}%`, detail: "Across graded submissions" },
      { label: "Active alerts", value: notifications.length, detail: "Workflow notifications" },
    ],
    queues: [
      { label: "Submissions awaiting grading", value: pending.length, detail: "Review feedback and save durable grades.", route: "/teacher/submissions" },
      { label: "Attendance register", value: "Open", detail: "Record the daily class register.", route: "/teacher/attendance" },
      { label: "Exam grade entry", value: "Open", detail: "Enter marks for configured assessments.", route: "/teacher/exam-grades" },
    ],
    links: [
      { label: "Assignments", detail: "Create and manage coursework.", route: "/teacher/assignments" },
      { label: "Grade summary", detail: "Review academic outcomes.", route: "/teacher/grade-summary" },
      { label: "Messages", detail: "Continue family conversations.", route: "/teacher/messages" },
    ],
    notifications,
  };
}

export async function fetchStudentDashboard(userId: string): Promise<RoleDashboardData | null> {
  const student = await fetchStudentProfileByUserId(userId);
  if (!student) return null;
  const [assignments, grades, attendance, submissionSnapshot, notifications] = await Promise.all([
    student.classId ? fetchAssignmentsByClass(student.classId) : [],
    fetchGradesByStudentId(student.studentId),
    fetchAttendanceByStudentId(student.studentId),
    getDocs(query(collection(db, "submissions"), where("studentUid", "==", userId))),
    fetchNotificationsForUser({ userId, role: "student", studentIds: [student.studentId] }),
  ]);
  const submissions = submissionSnapshot.docs.map((item) => item.data());
  const submittedAssignmentIds = new Set(submissions.map((submission) => submission.assignmentId));
  const outstanding = assignments.filter((assignment) => isActive(assignment) && !submittedAssignmentIds.has(assignment.id));

  return {
    name: student.displayName,
    context: `${student.studentId}${student.classId ? ` | ${student.classId}` : ""}`,
    metrics: [
      { label: "Assignments due", value: outstanding.length, detail: `${assignments.filter(isActive).length} active assignments` },
      { label: "Submissions", value: submissions.length, detail: "Coursework submitted" },
      { label: "Grades", value: grades.length, detail: "Recorded results" },
      { label: "Attendance", value: `${attendanceRate(attendance)}%`, detail: `${attendance.length} attendance records` },
    ],
    queues: [
      { label: "Assignments still to submit", value: outstanding.length, detail: "Review your active coursework and deadlines.", route: "/student/assignments" },
      { label: "Attendance record", value: `${attendanceRate(attendance)}%`, detail: "Review your daily attendance history.", route: "/student/attendance" },
      { label: "Recorded grades", value: grades.length, detail: "Check marks and teacher feedback.", route: "/student/grades" },
    ],
    links: [
      { label: "My assignments", detail: "View active coursework.", route: "/student/assignments" },
      { label: "My submissions", detail: "Track submitted work.", route: "/student/submissions" },
      { label: "Calendar", detail: "Check upcoming school dates.", route: "/calendar" },
    ],
    notifications,
  };
}

export async function fetchParentDashboard(userId: string): Promise<RoleDashboardData | null> {
  const parent = await getParentProfileByUserId(userId);
  if (!parent) return null;
  const studentIds = parent.studentIds || [];
  const [students, grades, attendance, charges, payments, reports, notifications] = await Promise.all([
    fetchStudentProfilesByIds(studentIds),
    fetchGradesByStudentIds(studentIds),
    fetchAttendanceByStudentIds(studentIds),
    fetchStudentChargesByStudentIds(studentIds),
    fetchFeePaymentsByStudentIds(studentIds),
    fetchPublishedReportsByStudentIds(studentIds),
    fetchNotificationsForUser({ userId, role: "parent", studentIds }),
  ]);
  const ledgers = buildLedgerSummaries(charges, payments);
  const balance = ledgers.reduce((sum, ledger) => sum + Math.max(ledger.balance, 0), 0);

  return {
    name: parent.displayName || "Parent workspace",
    context: `${students.length} linked student${students.length === 1 ? "" : "s"}`,
    metrics: [
      { label: "Linked students", value: students.length, detail: "Family profiles connected" },
      { label: "Attendance", value: `${attendanceRate(attendance)}%`, detail: `${attendance.length} attendance records` },
      { label: "Outstanding fees", value: currency(balance), detail: `${ledgers.filter((ledger) => ledger.balance > 0).length} balances open` },
      { label: "Released reports", value: reports.length, detail: "Published academic reports" },
    ],
    queues: [
      { label: "Outstanding fee balance", value: currency(balance), detail: "Review charges, payments, and receipts.", route: "/parent/fees" },
      { label: "Workflow notifications", value: notifications.length, detail: "Review family alerts and school updates.", route: "/notifications" },
      { label: "Published reports", value: reports.length, detail: "Open released academic snapshots.", route: "/parent/reports" },
    ],
    links: [
      { label: "Performance", detail: `${grades.length} recorded grade entries.`, route: "/parent/performance" },
      { label: "Attendance", detail: "Review linked student attendance.", route: "/parent/attendance" },
      { label: "Messages", detail: "Continue school conversations.", route: "/parent/messages" },
    ],
    notifications,
  };
}
