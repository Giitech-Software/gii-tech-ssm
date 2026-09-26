import { BarChart3, CalendarCheck2, QrCode, ScanFace, Settings2, Users } from "lucide-react";
import { Link } from "react-router-dom";

const tools = [
  ["Take student attendance", "Open the daily class register and record present, late, or absent status.", "/teacher/attendance", CalendarCheck2],
  ["Staff attendance", "Review staff check-ins, verification methods, and movement records.", "/admin/staff-attendance", Users],
  ["Face enrollment", "Enroll or replace a verified face linked to a student or staff school ID.", "/admin/face-enrollment", ScanFace],
  ["QR attendance", "Use QR identity cards for fast attendance lookup and recording.", "/admin/qr-attendance", QrCode],
  ["Attendance analytics", "Review attendance rates, trends, and summaries across the school.", "/admin/attendance-analytics", BarChart3],
  ["Attendance settings", "Configure staff attendance times and verification requirements.", "/admin/staff-attendance-settings", Settings2],
] as const;

export default function AttendanceWorkspacePage() {
  return <main className="mx-auto max-w-7xl space-y-7"><header><p className="eyebrow">School operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-dark">Attendance workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Record daily attendance, manage identity verification, and review attendance performance from one organized workspace.</p></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{tools.map(([title, detail, to, Icon]) => <Link key={to} to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon size={22} /></span><h2 className="mt-5 text-lg font-black text-dark">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p><span className="mt-5 inline-flex text-sm font-bold text-primary group-hover:text-sky-700">Open workspace →</span></Link>)}</section></main>;
}
