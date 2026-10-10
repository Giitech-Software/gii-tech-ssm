import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";
import { fetchStaffDirectory, fetchStudentDirectory } from "./DirectoryService";

export type EnterprisePeriod = { id: string; name?: string; startDate?: string; endDate?: string; academicYearId?: string };
export type EnterpriseAnalytics = {
  students: Array<{ period: string; active: number; total: number }>;
  performance: Array<{ period: string; assessment: string; average: number; entries: number; passRate: number }>;
  attendance: Array<{ period: string; present: number; late: number; excused: number; absent: number; rate: number }>;
  staff: Array<{ period: string; present: number; absent: number; late: number; total: number; turnout: number }>;
  generatedAt: string;
};

const scoped = (data: Record<string, unknown>) => !data.tenantId || String(data.tenantId) === TENANT_ID;
const text = (value: unknown, fallback = "Unassigned") => String(value || fallback);
const periodFor = (rawDate: unknown, terms: EnterprisePeriod[], years: EnterprisePeriod[]) => {
  const date = text(rawDate, "");
  const term = terms.find(item => date && item.startDate && item.endDate && date >= item.startDate && date <= item.endDate);
  if (term) return text(term.name);
  const year = years.find(item => date && item.startDate && item.endDate && date >= item.startDate && date <= item.endDate);
  return text(year?.name);
};

export async function fetchEnterpriseAnalytics(): Promise<EnterpriseAnalytics> {
  const [students, staff, yearsSnapshot, termsSnapshot, gradesSnapshot, examsSnapshot, attendanceSnapshot, staffAttendanceSnapshot] = await Promise.all([
    fetchStudentDirectory(), fetchStaffDirectory(), getDocs(collection(db, "academicYears")), getDocs(collection(db, "terms")), getDocs(collection(db, "grades")), getDocs(collection(db, "exams")), getDocs(collection(db, "attendance")), getDocs(collection(db, "staffAttendance")),
  ]);
  const years = yearsSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as EnterprisePeriod));
  const terms = termsSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as EnterprisePeriod));
  const periodNames = [...years.map(item => text(item.name)), ...terms.map(item => text(item.name))];
  const studentRows = periodNames.map(period => { const matching = students.filter(student => { const record = student as typeof student & { term?: string }; return text(record.academicYear, "") === period || text(record.term, "") === period; }); const active = matching.filter(student => String(student.status || "active").toLowerCase() === "active").length; return { period, active, total: matching.length }; }).filter(item => item.total);
  const exams = examsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }) as Record<string, unknown> & { id: string }).filter(scoped);
  const examNames = new Map(exams.map(item => [String(item.id), text(item.name, "Assessment")]));
  const performanceMap = new Map<string, { total: number; count: number; pass: number }>();
  gradesSnapshot.docs.map(item => item.data()).filter(scoped).forEach(grade => { const mark = Number(grade.finalScore ?? grade.score ?? grade.mark); if (!Number.isFinite(mark)) return; const period = text(grade.academicYear || grade.term, "Unassigned"); const assessment = text(grade.examName || examNames.get(String(grade.examId)), "Assessment"); const key = `${period}::${assessment}`; const current = performanceMap.get(key) || { total: 0, count: 0, pass: 0 }; current.total += mark; current.count += 1; if (mark >= 50) current.pass += 1; performanceMap.set(key, current); });
  const performance = [...performanceMap.entries()].map(([key, value]) => { const [period, assessment] = key.split("::"); return { period, assessment, average: Math.round((value.total / value.count) * 10) / 10, entries: value.count, passRate: Math.round((value.pass / value.count) * 100) }; });
  const attendanceMap = new Map<string, { present: number; late: number; excused: number; absent: number }>();
  attendanceSnapshot.docs.map(item => item.data()).filter(scoped).forEach(record => { const period = periodFor(text(record.date, ""), terms, years); const current = attendanceMap.get(period) || { present: 0, late: 0, excused: 0, absent: 0 }; const status = String(record.status || (record.present ? "Present" : "Absent")).toLowerCase(); if (status === "late") current.late += 1; else if (status === "excused") current.excused += 1; else if (status === "present" || record.present === true) current.present += 1; else current.absent += 1; attendanceMap.set(period, current); });
  const attendance = [...attendanceMap.entries()].map(([period, value]) => ({ period, ...value, rate: Math.round(((value.present + value.late) / Math.max(1, value.present + value.late + value.excused + value.absent)) * 100) }));
  const staffMap = new Map<string, { present: number; absent: number; late: number }>();
  staffAttendanceSnapshot.docs.map(item => item.data()).filter(scoped).forEach(record => { const period = periodFor(text(record.date, ""), terms, years); const current = staffMap.get(period) || { present: 0, absent: 0, late: 0 }; const status = String(record.status || "absent").toLowerCase(); if (status === "late") current.late += 1; else if (status === "present") current.present += 1; else current.absent += 1; staffMap.set(period, current); });
  const staffRows = [...staffMap.entries()].map(([period, value]) => ({ period, ...value, total: staff.length, turnout: Math.round(((value.present + value.late) / Math.max(1, staff.length)) * 100) }));
  return { students: studentRows, performance, attendance, staff: staffRows, generatedAt: new Date().toISOString() };
}
