import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  GraduationCap,
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
import { backfillAstemTenant } from "../services/TenantMigrationService";

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

function MetricCard({ icon, label, value, detail, tone = "bg-primary/10 text-primary" }: MetricCardProps) {
  return (
    <div className="surface surface-hover min-w-0 border-primary/20 p-5">
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
  const [migrating, setMigrating] = useState(false);

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
  const migrateTenant = async () => {
    if (!window.confirm("Add tenant ID astem-ssm-001 to existing records that do not have one?")) return;
    setMigrating(true); setSyncMessage("");
    try { const result = await backfillAstemTenant(); setSyncMessage(`${result.updated} records were assigned to tenant ${result.tenantId}.`); }
    catch (migrationError) { setSyncMessage(migrationError instanceof Error ? migrationError.message : "Tenant migration failed."); }
    finally { setMigrating(false); }
  };

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (!metrics && loading) {
    return (
      <div className="surface flex min-h-80 items-center justify-center gap-3 text-sm text-slate-500">
        <RefreshCw className="animate-spin text-accent1" size={18} /> Loading operational dashboard...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p>{error}</p>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 font-semibold"
          onClick={() => void loadMetrics()}
          type="button"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary via-blue-800 to-accent1 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">ASTEM-SSM dashboard</p>
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
          <button disabled={migrating} onClick={() => void migrateTenant()} type="button" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60">
            <ShieldCheck size={15} /> {migrating ? "Assigning tenant..." : "Assign tenant IDs"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}
      {syncMessage && <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-primary">{syncMessage}</div>}

      <section aria-label="Administration dashboard">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 2xl:grid-cols-5">
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

    </div>
  );
}
