import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, RefreshCw } from "lucide-react";
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { TENANT_ID } from "../../config/tenant";

type RecordType = "Student" | "Staff";
type ArchivedRecord = { id: string; name: string; schoolId: string; type: RecordType; collectionName: "students" | "teachers" | "staff"; classId: string; departmentId: string; status: string };

export default function ArchivePage() {
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | RecordType>("all");
  const [classId, setClassId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<"all" | "withdrawn" | "archived">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [students, teachers, staff, classSnapshot, departmentSnapshot] = await Promise.all([
        getDocs(query(collection(db, "students"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "teachers"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "staff"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "classes"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "departments"), where("tenantId", "==", TENANT_ID))),
      ]);
      const rows = [
        ...students.docs.map(item => ({ item, type: "Student" as const, collectionName: "students" as const })),
        ...teachers.docs.map(item => ({ item, type: "Staff" as const, collectionName: "teachers" as const })),
        ...staff.docs.map(item => ({ item, type: "Staff" as const, collectionName: "staff" as const })),
      ];
      setRecords(rows.filter(({ item }) => ["archived", "withdrawn"].includes(String(item.data().status || ""))).map(({ item, type, collectionName }) => {
        const data = item.data();
        return { id: item.id, type, collectionName, name: String(data.displayName || data.name || data.staffName || item.id), schoolId: String(data.studentId || data.staffId || data.teacherId || item.id), classId: String(data.classId || ""), departmentId: String(data.departmentId || data.department || ""), status: String(data.status || "archived") };
      }));
      setClasses(classSnapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || item.id) })));
      setDepartments(departmentSnapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || item.id) })));
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to load archived records."); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => records.filter(item => (filter === "all" || item.type === filter) && (status === "all" || item.status === status) && (!classId || item.classId === classId) && (!departmentId || item.departmentId === departmentId) && `${item.name} ${item.schoolId}`.toLowerCase().includes(search.toLowerCase())), [classId, departmentId, filter, records, search, status]);
  const restore = async (item: ArchivedRecord) => { setBusy(item.id); try { await updateDoc(doc(db, item.collectionName, item.id), { status: "active", lifecycleStatus: "active", loginDisabled: false, restoredAt: serverTimestamp() }); setRecords(current => current.filter(row => !(row.id === item.id && row.collectionName === item.collectionName))); setMessage(`${item.name} restored successfully.`); } catch (value) { setError(value instanceof Error ? value.message : "Unable to restore this record."); } finally { setBusy(""); } };

  return <main className="mx-auto max-w-7xl space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Records management</p><h1 className="mt-1 text-3xl font-black tracking-tight text-dark">Withdrawn and archived records</h1><p className="mt-2 text-sm text-slate-600">Identify learner withdrawals by class and staff records by department before making enrollment decisions.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} /> Refresh</button></header>{message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="grid gap-6 lg:grid-cols-[250px_1fr]"><aside className="surface h-fit space-y-4 p-4"><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Filter records</p><p className="mt-1 text-xs text-slate-500">Narrow the archive before reviewing trends.</p></div><label className="block text-sm font-semibold text-slate-700">Record type<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="input mt-1"><option value="all">All records</option><option value="Student">Students</option><option value="Staff">Staff</option></select></label><label className="block text-sm font-semibold text-slate-700">Student status<select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="input mt-1"><option value="all">Withdrawn and archived</option><option value="withdrawn">Withdrawn only</option><option value="archived">Archived only</option></select></label><label className="block text-sm font-semibold text-slate-700">Class<select value={classId} onChange={event => setClassId(event.target.value)} className="input mt-1"><option value="">All classes</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Department<select value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="input mt-1"><option value="">All departments</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={() => { setFilter("all"); setStatus("all"); setClassId(""); setDepartmentId(""); setSearch(""); }} className="w-full rounded-xl border px-3 py-2 text-sm font-bold text-slate-600">Clear filters</button></aside><section className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or school ID" className="input w-full md:max-w-sm"/><span className="text-sm text-slate-500">{visible.length} matching records</span></div>{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading archive...</p> : visible.length ? <div className="divide-y divide-slate-100">{visible.map(item => <div key={`${item.collectionName}-${item.id}`} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><p className="font-bold text-dark">{item.name}</p><span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${item.status === "withdrawn" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></div><p className="mt-1 text-xs text-slate-500">{item.type} · {item.schoolId}{item.classId ? ` · Class ${item.classId}` : ""}{item.departmentId ? ` · Department ${item.departmentId}` : ""}</p></div><button disabled={busy === item.id} onClick={() => void restore(item)} className="inline-flex items-center gap-2 rounded-xl bg-accent2 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><ArchiveRestore size={16}/>{busy === item.id ? "Restoring..." : "Restore record"}</button></div>)}</div> : <div className="empty-state m-5">No records match the selected filters.</div>}</section></div></main>;
}
