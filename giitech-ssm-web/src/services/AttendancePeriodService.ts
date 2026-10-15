import { getAcademicTerms, getAcademicYears, type AcademicTerm, type AcademicYear } from "./AcademicYearService";

export type AttendancePeriod = "day" | "week" | "month" | "term" | "year";
export type AttendanceCalendar = { years: AcademicYear[]; terms: AcademicTerm[] };

export async function getAttendanceCalendar(): Promise<AttendanceCalendar> {
  const years = await getAcademicYears();
  const termGroups = await Promise.all(years.map(year => getAcademicTerms(year.id)));
  return { years, terms: termGroups.flat() };
}

export function dateInRange(date: string, start: string, end: string) { return date >= start && date <= end; }

export function isInstructionalDate(date: string, term?: AcademicTerm) {
  return !!term && dateInRange(date, term.startDate, term.endDate) && !(term.holidays || []).includes(date);
}

export function resolveAttendanceTerm(date: string, calendar: AttendanceCalendar) {
  const term = calendar.terms.find(item => isInstructionalDate(date, item));
  if (!term) return undefined;
  const year = calendar.years.find(item => item.id === term.academicYearId);
  return { term: term.name, termId: term.id, academicYear: year?.name || "", academicYearId: term.academicYearId };
}

export function periodBounds(period: AttendancePeriod, anchor: string, term?: AcademicTerm) {
  if (period === "term" && term) return { start: term.startDate, end: term.endDate };
  if (period === "day") return { start: anchor, end: anchor };
  const point = new Date(`${anchor}T00:00:00`); const start = new Date(point); const end = new Date(point);
  if (period === "week") { const day = point.getDay() || 7; start.setDate(point.getDate() - day + 1); end.setDate(start.getDate() + 6); }
  if (period === "month") { start.setDate(1); end.setMonth(start.getMonth() + 1); end.setDate(0); }
  if (period === "year") { start.setMonth(0, 1); end.setMonth(11, 31); }
  const iso = (value: Date) => value.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}
