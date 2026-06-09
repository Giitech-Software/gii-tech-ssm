import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Search } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { fetchRecentActivityLogs, type ActivityLogRecord } from "../../services/ActivityLogService";

const formatDate = (value?: Timestamp | string) => {
  if (!value) return "-";
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const detailSummary = (details?: Record<string, unknown>) => {
  if (!details) return "-";
  const values = Object.entries(details).slice(0, 3);
  return values.length ? values.map(([key, value]) => `${key}: ${String(value)}`).join(" | ") : "-";
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      setLogs(await fetchRecentActivityLogs());
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      `${log.action} ${log.userId || ""} ${detailSummary(log.details)}`.toLowerCase().includes(term)
    );
  }, [logs, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-gray-600">Review recent administrative and profile actions.</p>
        </div>
        <button onClick={loadLogs} disabled={loading} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
        </button>
      </div>
      <label className="relative block max-w-md">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, user, or details" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" />
      </label>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Details</th></tr></thead>
          <tbody className="divide-y">
            {!loading && filteredLogs.map((log) => <tr key={log.id} className="hover:bg-gray-50"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(log.createdAt)}</td><td className="px-4 py-3 font-medium text-gray-900">{log.action.replaceAll("_", " ")}</td><td className="px-4 py-3 text-gray-600">{log.userId || "-"}</td><td className="px-4 py-3 text-gray-600">{detailSummary(log.details)}</td></tr>)}
            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Loading activity logs...</td></tr>}
            {!loading && !filteredLogs.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500"><Activity className="mx-auto mb-2" size={20} />No activity records match the search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
