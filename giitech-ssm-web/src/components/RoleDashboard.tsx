import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchParentDashboard,
  fetchStudentDashboard,
  fetchTeacherDashboard,
  type RoleDashboardData,
} from "../services/RoleDashboardService";

interface RoleDashboardProps {
  role: "teacher" | "student" | "parent";
}

export default function RoleDashboard({ role }: RoleDashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<RoleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const dashboard =
        role === "teacher"
          ? await fetchTeacherDashboard(user.uid)
          : role === "student"
            ? await fetchStudentDashboard(user.uid)
            : await fetchParentDashboard(user.uid);
      if (!dashboard) throw new Error("Your role profile could not be found.");
      setData(dashboard);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data && loading) return <div className="surface flex min-h-64 items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 animate-spin text-accent1" size={17} />Loading dashboard...</div>;
  if (!data) return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary via-blue-800 to-accent1 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Your school workspace</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{data.name}</h1>
          <p className="mt-2 text-sm text-blue-100">{data.context}</p>
        </div>
        <button title="Refresh dashboard" aria-label="Refresh dashboard" disabled={loading} onClick={() => void load()} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-60"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /></button>
      </header>
      {error && <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => <div key={metric.label} className="surface surface-hover p-5"><p className="eyebrow">{metric.label}</p><p className="mt-2 text-2xl font-black tracking-tight text-dark">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></div>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Action queue</h2>
          <p className="mb-3 text-sm text-gray-500">The next work items that deserve attention.</p>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {data.queues.map((item) => <Link key={item.label} to={item.route} className="flex items-center gap-3 p-4 hover:bg-gray-50"><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-950">{item.label}</span><span className="mt-1 block text-xs text-gray-500">{item.detail}</span></span><strong className="text-sm text-gray-900">{item.value}</strong><ArrowRight size={16} className="text-gray-400" /></Link>)}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold text-gray-950">Notifications</h2><p className="mb-3 text-sm text-gray-500">Active workflow alerts and school notices.</p></div>
            <Link to="/notifications" title="Open notifications" className="text-gray-500 hover:text-gray-900"><Bell size={18} /></Link>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {data.notifications.slice(0, 4).map((item) => <Link key={item.id} to={item.route || "/notifications"} className="block p-4 hover:bg-gray-50"><p className="text-sm font-medium text-gray-950">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.message}</p></Link>)}
            {!data.notifications.length && <p className="p-4 text-sm text-gray-500">No active notifications.</p>}
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-base font-semibold text-gray-950">Workspace</h2>
        <p className="mb-3 text-sm text-gray-500">Frequently used tools for your role.</p>
        <div className="grid gap-4 sm:grid-cols-3">{data.links.map((item) => <Link key={item.label} to={item.route} className="surface surface-hover p-5"><p className="text-sm font-bold text-dark">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></Link>)}</div>
      </section>
    </div>
  );
}
