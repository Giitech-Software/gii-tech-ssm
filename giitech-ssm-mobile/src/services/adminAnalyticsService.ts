import { buildLedgerSummaries, fetchAdminFinance, type FeePayment, type StudentCharge } from "./adminFinanceService";
import { fetchAdminFamilyReports, type PublishedReport } from "./adminFamilyReportService";
import { fetchAdminOperations, type AdminAttendanceRecord } from "./adminOperationsService";
import { classNameFor, fetchAdminDirectory, type StudentDirectoryRecord } from "./adminService";

export type StudentGradeSummary = {
  id: string;
  subject: string;
  mark: number;
  academicYear: string;
  term: string;
};

export type StudentAnalyticsSummary = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: string;
  averageGrade: number;
  gradeCount: number;
  attendancePresent: number;
  attendanceTotal: number;
  attendanceRate: number;
  charged: number;
  paid: number;
  balance: number;
  releasedReports: number;
};

export type ClassAnalyticsSummary = {
  classId: string;
  className: string;
  students: number;
  averageGrade: number;
  attendanceRate: number;
  outstandingBalance: number;
};

export type AdminAnalyticsData = {
  students: StudentAnalyticsSummary[];
  classes: ClassAnalyticsSummary[];
  totals: {
    students: number;
    activeStudents: number;
    averageGrade: number;
    attendanceRate: number;
    outstandingBalance: number;
    releasedReports: number;
  };
  loadedAt: string;
  source: "live" | "cache";
};

export type StudentReportDetail = {
  student: StudentDirectoryRecord;
  summary: StudentAnalyticsSummary;
  grades: StudentGradeSummary[];
  attendance: AdminAttendanceRecord[];
  charges: StudentCharge[];
  payments: FeePayment[];
  reports: PublishedReport[];
  loadedAt: string;
  source: "live" | "cache";
};

function rate(present: number, total: number) {
  return total ? Math.round((present / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function mark(value: Record<string, unknown>) {
  return Number(value.mark ?? value.score ?? value.grade ?? 0) || 0;
}

function gradeSummary(value: Record<string, unknown> & { id: string }): StudentGradeSummary {
  return {
    id: value.id,
    subject: String(value.subject || value.subjectName || value.assignmentTitle || "General"),
    mark: mark(value),
    academicYear: String(value.academicYear || ""),
    term: String(value.term || ""),
  };
}

function buildAdminAnalytics(
  directory: Awaited<ReturnType<typeof fetchAdminDirectory>>,
  family: Awaited<ReturnType<typeof fetchAdminFamilyReports>>,
  operations: Awaited<ReturnType<typeof fetchAdminOperations>>,
  finance: Awaited<ReturnType<typeof fetchAdminFinance>>
): AdminAnalyticsData {
  const ledgers = new Map(buildLedgerSummaries(finance.charges, finance.payments).map((item) => [item.studentId, item]));
  const students = directory.data.students.map((student) => {
    const grades = family.grades.filter((item) => String(item.studentId || "") === student.studentId);
    const attendance = operations.attendance.filter((item) => item.studentId === student.studentId);
    const present = attendance.filter((item) => item.status === "Present").length;
    const ledger = ledgers.get(student.studentId);
    return {
      studentId: student.studentId,
      studentName: student.displayName,
      classId: student.classId,
      className: classNameFor(directory.data.classes, student.classId),
      status: student.status,
      averageGrade: average(grades.map(mark)),
      gradeCount: grades.length,
      attendancePresent: present,
      attendanceTotal: attendance.length,
      attendanceRate: rate(present, attendance.length),
      charged: ledger?.charged || 0,
      paid: ledger?.paid || 0,
      balance: ledger?.balance || 0,
      releasedReports: family.reports.filter((item) => item.studentId === student.studentId && item.published).length,
    };
  }).sort((left, right) => left.studentName.localeCompare(right.studentName));
  const classes = directory.data.classes.map((item) => {
    const classId = item.classId || item.id;
    const matching = students.filter((student) => student.classId === classId);
    return {
      classId,
      className: item.name,
      students: matching.length,
      averageGrade: average(matching.filter((student) => student.gradeCount).map((student) => student.averageGrade)),
      attendanceRate: rate(matching.reduce((total, student) => total + student.attendancePresent, 0), matching.reduce((total, student) => total + student.attendanceTotal, 0)),
      outstandingBalance: matching.reduce((total, student) => total + student.balance, 0),
    };
  }).sort((left, right) => left.className.localeCompare(right.className));
  const recordedGrades = students.filter((student) => student.gradeCount);
  const totalPresent = students.reduce((total, student) => total + student.attendancePresent, 0);
  const totalAttendance = students.reduce((total, student) => total + student.attendanceTotal, 0);
  return {
    students,
    classes,
    totals: {
      students: students.length,
      activeStudents: students.filter((student) => student.status === "active").length,
      averageGrade: average(recordedGrades.map((student) => student.averageGrade)),
      attendanceRate: rate(totalPresent, totalAttendance),
      outstandingBalance: students.reduce((total, student) => total + student.balance, 0),
      releasedReports: family.reports.filter((item) => item.published).length,
    },
    loadedAt: new Date().toISOString(),
    source: directory.source === "cache" || family.source === "cache" || operations.source === "cache" || finance.source === "cache" ? "cache" : "live",
  };
}

export async function fetchAdminAnalytics(userId: string): Promise<AdminAnalyticsData> {
  const records = await Promise.all([
    fetchAdminDirectory(userId),
    fetchAdminFamilyReports(userId),
    fetchAdminOperations(userId),
    fetchAdminFinance(userId),
  ]);
  return buildAdminAnalytics(...records);
}

export async function fetchStudentReportDetail(userId: string, studentId: string): Promise<StudentReportDetail> {
  const records = await Promise.all([
    fetchAdminDirectory(userId),
    fetchAdminFamilyReports(userId),
    fetchAdminOperations(userId),
    fetchAdminFinance(userId),
  ]);
  const [directory, family, operations, finance] = records;
  const analytics = buildAdminAnalytics(...records);
  const student = directory.data.students.find((item) => item.studentId === studentId);
  const summary = analytics.students.find((item) => item.studentId === studentId);
  if (!student || !summary) throw new Error("Student report record was not found.");
  return {
    student,
    summary,
    grades: family.grades.filter((item) => String(item.studentId || "") === studentId).map(gradeSummary).sort((left, right) => `${right.academicYear}:${right.term}`.localeCompare(`${left.academicYear}:${left.term}`)),
    attendance: operations.attendance.filter((item) => item.studentId === studentId),
    charges: finance.charges.filter((item) => item.studentId === studentId),
    payments: finance.payments.filter((item) => item.studentId === studentId),
    reports: family.reports.filter((item) => item.studentId === studentId),
    loadedAt: analytics.loadedAt,
    source: analytics.source,
  };
}
