import { Link } from "react-router-dom";
import { CalendarCheck, MessageCircle } from "lucide-react";

export default function StaffDashboard() {
  const tools = [
    { to: "/staff/attendance", title: "Attendance", detail: "Record and review student attendance for assigned school operations.", icon: CalendarCheck },
    { to: "/staff/messages", title: "Communication", detail: "Send and receive operational messages with the school team.", icon: MessageCircle },
  ];
  return <div className="mx-auto max-w-5xl space-y-6"><div className="rounded-2xl bg-slate-900 p-7 text-white"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Limited staff portal</p><h1 className="mt-2 text-3xl font-bold">Welcome to your staff workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Access only the attendance and communication tools assigned to non-teaching staff.</p></div><div className="grid gap-4 md:grid-cols-2">{tools.map(({ to, title, detail, icon: Icon }) => <Link key={to} to={to} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"><Icon className="text-indigo-600" size={24} /><h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p><span className="mt-4 inline-block text-sm font-semibold text-indigo-700">Open workspace →</span></Link>)}</div></div>;
}
