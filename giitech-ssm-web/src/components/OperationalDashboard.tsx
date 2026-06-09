import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Link2,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import {
  fetchOperationalMetrics,
  type OperationalMetrics,
} from "../services/OperationalMetricsService";
import { syncWorkflowEscalations } from "../services/WorkflowEscalationService";

interface OperationalDashboardProps {
  title: string;
  subtitle: string;
  showAccountMetrics?: boolean;
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

function formatTimestamp(value: unknown): string {
  if (!value) return "Not recorded";
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toLocaleString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function MetricCard({ icon, label, value, detail, tone = "bg-primary/10 text-primary" }: MetricCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 text-slate-500">
        <span className="text-sm font-medium">{label}</span>
        <span className={`rounded-lg p-2 ${tone}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-dark">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function OperationalDashboard({
  title,
  subtitle,
  showAccountMetrics = false,
}: OperationalDashboardProps) {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMetrics(await fetchOperationalMetrics());
    } catch (loadError) {
      console.error("Failed to load operational metrics", loadError);
      setError("Operational metrics could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncEscalations = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const result = await syncWorkflowEscalations();
      setSyncMessage(`${result.active} active alerts refreshed. ${result.resolved} resolved.`);
    } catch (syncError) {
      console.error("Failed to synchronize workflow alerts", syncError);
      setSyncMessage("Workflow alerts could not be synchronized.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (!metrics && loading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-gray-500">
        Loading operational dashboard...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button
          className="mt-3 inline-flex items-center gap-2 border border-red-300 bg-white px-3 py-2 font-medium"
          onClick={() => void loadMetrics()}
          type="button"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }

  const attentionItems = [
    {
      label: "Family links requiring review",
      detail: `${metrics.unresolvedStudentLinks} student records and ${metrics.unlinkedParents} parent records need attention.`,
      value: metrics.unresolvedStudentLinks + metrics.unlinkedParents,
      path: "/admin/identity-links",
      icon: <Link2 size={18} />,
    },
    {
      label: "Students with outstanding balances",
      detail: `${currency.format(metrics.outstandingFees)} remains outstanding across the ledger.`,
      value: metrics.studentsWithBalances,
      path: "/admin/finance",
      icon: <WalletCards size={18} />,
    },
    {
      label: "Submissions awaiting grading",
      detail: "Monitor assessment readiness before publishing reports.",
      value: metrics.pendingSubmissions,
      path: "/admin/assessments",
      icon: <ClipboardCheck size={18} />,
    },
    {
      label: "Upcoming exam assessments",
      detail: `${metrics.activeTerms} active term${metrics.activeTerms === 1 ? "" : "s"} configured.`,
      value: metrics.upcomingExams,
      path: "/admin/assessments",
      icon: <CalendarCheck size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary via-blue-800 to-accent1 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">School management overview</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-blue-100">
            Updated {metrics.generatedAt.toLocaleTimeString()}
          </span>
          <button
            aria-label="Refresh operational metrics"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadMetrics()}
            title="Refresh operational metrics"
            type="button"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </button>
          <button disabled={syncing} onClick={() => void syncEscalations()} type="button" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white px-3 py-2 text-sm font-semibold text-primary transition hover:bg-blue-50 disabled:opacity-60">
            <Bell size={15} />
            {syncing ? "Syncing..." : "Sync alerts"}
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}
      {syncMessage && <div className="border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{syncMessage}</div>}

      <section aria-label="Operational overview">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail={`${metrics.totalStudents} student profiles total`}
            icon={<GraduationCap size={18} />}
            label="Active students"
            tone="bg-blue-50 text-primary"
            value={metrics.activeStudents}
          />
          <MetricCard
            detail={`${metrics.totalParents} parent profiles`}
            icon={<Users size={18} />}
            label="Staff profiles"
            tone="bg-sky-50 text-accent1"
            value={metrics.totalStaff}
          />
          <MetricCard
            detail={`${metrics.studentsWithBalances} student ledgers`}
            icon={<WalletCards size={18} />}
            label="Outstanding fees"
            tone="bg-yellow-50 text-yellow-700"
            value={currency.format(metrics.outstandingFees)}
          />
          <MetricCard
            detail={`${metrics.attendanceTodayRecords} attendance records today`}
            icon={<CalendarCheck size={18} />}
            label="Attendance today"
            tone="bg-emerald-50 text-accent2"
            value={`${metrics.attendanceTodayRate}%`}
          />
          <MetricCard
            detail="Teacher action queue"
            icon={<ClipboardCheck size={18} />}
            label="Pending grading"
            tone="bg-orange-50 text-orange-600"
            value={metrics.pendingSubmissions}
          />
          <MetricCard
            detail="Published family snapshots"
            icon={<FileCheck2 size={18} />}
            label="Released reports"
            tone="bg-indigo-50 text-indigo-600"
            value={metrics.releasedReports}
          />
          <MetricCard
            detail={`${metrics.unlinkedParents} unlinked parent profiles`}
            icon={<Link2 size={18} />}
            label="Student link issues"
            tone="bg-rose-50 text-danger"
            value={metrics.unresolvedStudentLinks}
          />
          <MetricCard
            detail={`${metrics.academicOptions} academic options configured`}
            icon={<Activity size={18} />}
            label="Upcoming exams"
            tone="bg-cyan-50 text-cyan-700"
            value={metrics.upcomingExams}
          />
        </div>
      </section>

      {showAccountMetrics && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Account registry
              </h2>
              <p className="text-sm text-gray-500">
                Authentication profiles by operational role.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
              to="/superadmin/users"
            >
              Manage accounts
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              detail="All registered profiles"
              icon={<UserCog size={18} />}
              label="Accounts"
              value={metrics.accounts.total}
            />
            <MetricCard
              detail="System oversight"
              icon={<ShieldCheck size={18} />}
              label="Super admins"
              value={metrics.accounts.superadmins}
            />
            <MetricCard
              detail="School administrators"
              icon={<ShieldCheck size={18} />}
              label="Admins"
              value={metrics.accounts.admins}
            />
            <MetricCard
              detail="Teaching accounts"
              icon={<Users size={18} />}
              label="Teachers"
              value={metrics.accounts.teachers}
            />
            <MetricCard
              detail="Student logins"
              icon={<GraduationCap size={18} />}
              label="Students"
              value={metrics.accounts.students}
            />
            <MetricCard
              detail="Family access"
              icon={<Users size={18} />}
              label="Parents"
              value={metrics.accounts.parents}
            />
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-950">
              Operational attention
            </h2>
            <p className="text-sm text-gray-500">
              Work queues that need administrative follow-through.
            </p>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {attentionItems.map((item) => (
              <Link
                className="flex items-center gap-3 p-4 transition hover:bg-blue-50/60"
                key={item.label}
                to={item.path}
              >
                <span className="rounded-lg bg-blue-50 p-2 text-primary">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-950">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {item.detail}
                  </span>
                </span>
                <strong className="text-base text-gray-950">{item.value}</strong>
                <ArrowRight className="text-gray-400" size={16} />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-950">
              Recent activity
            </h2>
            <p className="text-sm text-gray-500">
              The latest recorded operational changes.
            </p>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {metrics.recentActivity.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No activity has been recorded yet.
              </p>
            ) : (
              metrics.recentActivity.map((entry) => (
                <div className="p-4" key={entry.id}>
                  <p className="text-sm font-medium text-gray-950">
                    {entry.action}
                  </p>
                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                    <span>{entry.userId || "System"}</span>
                    <span>{formatTimestamp(entry.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
