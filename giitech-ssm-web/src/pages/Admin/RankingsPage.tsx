import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { calculateRankings, type RankingRow } from "../../services/RankingService";

export default function RankingsPage() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setRows(await calculateRankings()); } catch (value) { setError(value instanceof Error ? value.message : "Unable to calculate rankings."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <main className="mx-auto max-w-6xl space-y-6"><header className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Performance</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Student rankings</h1><p className="mt-2 text-sm text-slate-500">Rank students by average performance using the active grade records.</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={16} /> Refresh</button></header>{error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Unable to load rankings. Please try again.</p>}<section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5"><table className="min-w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Average</th></tr></thead><tbody>{rows.map(row => <tr key={row.studentId} className="border-b border-slate-100"><td className="px-3 py-3 font-bold text-primary">{row.rank}</td><td className="px-3 py-3 font-semibold">{row.studentName}</td><td className="px-3 py-3 text-slate-500">{row.classId || "—"}</td><td className="px-3 py-3 font-bold">{row.overallAverage.toFixed(1)}%</td></tr>)}</tbody></table>{loading && <p className="p-6 text-center text-sm text-slate-500">Calculating rankings...</p>}{!loading && !error && !rows.length && <p className="p-6 text-center text-sm text-slate-500">No grade records match this school.</p>}</section></main>;
}
