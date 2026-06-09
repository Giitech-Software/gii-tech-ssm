import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckSquare, History, RefreshCw, Square } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchAcademicOptions,
  fetchStudentDirectory,
  type AcademicOption,
  type StudentDirectoryRecord,
} from "../../services/DirectoryService";
import {
  fetchPromotionHistory,
  promoteStudents,
  type PromotionHistoryRecord,
} from "../../services/PromotionService";
import { logActivity } from "../../utils/firestoreHelpers";

const nextAcademicYear = () => {
  const today = new Date();
  const start = today.getMonth() >= 7 ? today.getFullYear() + 1 : today.getFullYear();
  return `${start}/${start + 1}`;
};

const formatDate = (value?: Timestamp | string) => {
  if (!value) return "-";
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const emptyOptions = { departments: [], classes: [], streams: [] } as {
  departments: AcademicOption[];
  classes: AcademicOption[];
  streams: AcademicOption[];
};

export default function PromotionsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [options, setOptions] = useState(emptyOptions);
  const [history, setHistory] = useState<PromotionHistoryRecord[]>([]);
  const [sourceClassId, setSourceClassId] = useState("");
  const [sourceStreamId, setSourceStreamId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStreamId, setTargetStreamId] = useState("");
  const [academicYear, setAcademicYear] = useState(nextAcademicYear());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentRecords, academicOptions, historyRecords] = await Promise.all([
        fetchStudentDirectory(),
        fetchAcademicOptions(),
        fetchPromotionHistory(),
      ]);
      setStudents(studentRecords);
      setOptions(academicOptions);
      setHistory(historyRecords);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load promotion data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const sourceStudents = useMemo(() => students.filter((student) => {
    const studentStream = student.streamId || student.stream;
    return (student.status || "active") === "active" &&
      !!sourceClassId &&
      student.classId === sourceClassId &&
      (!sourceStreamId || studentStream === sourceStreamId);
  }), [sourceClassId, sourceStreamId, students]);

  const selectedStudents = sourceStudents.filter((student) => selectedIds.includes(student.id));
  const sourceStreams = options.streams.filter((item) => item.classId === sourceClassId);
  const targetStreams = options.streams.filter((item) => item.classId === targetClassId);
  const className = (classId?: string) => options.classes.find((item) => (item.classId || item.id) === classId)?.name || classId || "-";
  const streamName = (streamId?: string) => options.streams.find((item) => (item.streamId || item.id) === streamId)?.name || streamId || "-";

  const toggleStudent = (id: string) => setSelectedIds((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  );
  const toggleAll = () => setSelectedIds(
    selectedIds.length === sourceStudents.length ? [] : sourceStudents.map((student) => student.id)
  );

  const executePromotion = async () => {
    if (!selectedStudents.length || !targetClassId || !academicYear.trim()) return;
    if (!window.confirm(`Promote ${selectedStudents.length} selected student${selectedStudents.length === 1 ? "" : "s"} to ${className(targetClassId)} for ${academicYear}?`)) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await promoteStudents({
        students: selectedStudents,
        toClassId: targetClassId,
        toStreamId: targetStreamId,
        toAcademicYear: academicYear.trim(),
        promotedBy: user?.uid,
      });
      await logActivity(user?.uid || "", "promote_students", {
        batchId: result.batchId,
        count: result.count,
        fromClassId: sourceClassId,
        toClassId: targetClassId,
        academicYear,
      });
      setNotice(`${result.count} student${result.count === 1 ? "" : "s"} promoted. Batch: ${result.batchId}`);
      setSelectedIds([]);
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to complete the promotion batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">Student Promotion</h1><p className="mt-1 text-sm text-gray-600">Move selected students into their next academic placement with a recorded history.</p></div><button onClick={loadData} disabled={loading} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button></div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3">
          <div className="grid gap-3 border bg-white p-4 md:grid-cols-2"><Select label="Source class" value={sourceClassId} onChange={(value) => { setSourceClassId(value); setSourceStreamId(""); setSelectedIds([]); }} options={options.classes.map((item) => ({ value: item.classId || item.id, label: item.name }))} /><Select label="Source stream" value={sourceStreamId} onChange={(value) => { setSourceStreamId(value); setSelectedIds([]); }} options={sourceStreams.map((item) => ({ value: item.streamId || item.id, label: item.name }))} optional /></div>
          <div className="overflow-x-auto border bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="w-12 px-4 py-3"><button title="Select all" onClick={toggleAll}>{sourceStudents.length > 0 && selectedIds.length === sourceStudents.length ? <CheckSquare size={17} /> : <Square size={17} />}</button></th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Current Placement</th><th className="px-4 py-3">Academic Year</th></tr></thead><tbody className="divide-y">{sourceStudents.map((student) => <tr key={student.id} onClick={() => toggleStudent(student.id)} className="cursor-pointer hover:bg-indigo-50"><td className="px-4 py-3">{selectedIds.includes(student.id) ? <CheckSquare className="text-indigo-600" size={17} /> : <Square className="text-gray-400" size={17} />}</td><td className="px-4 py-3"><p className="font-medium">{student.displayName}</p><p className="text-xs text-gray-500">{student.studentId}</p></td><td className="px-4 py-3">{className(student.classId)}<p className="text-xs text-gray-500">{streamName(student.streamId || student.stream)}</p></td><td className="px-4 py-3 text-gray-600">{student.academicYear || "Not set"}</td></tr>)}{!loading && !sourceStudents.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Choose a source class to preview active students.</td></tr>}</tbody></table></div>
        </section>
        <aside className="space-y-3 border bg-white p-4"><h2 className="font-semibold">Target Placement</h2><Select label="Target class" value={targetClassId} onChange={(value) => { setTargetClassId(value); setTargetStreamId(""); }} options={options.classes.map((item) => ({ value: item.classId || item.id, label: item.name }))} /><Select label="Target stream" value={targetStreamId} onChange={setTargetStreamId} options={targetStreams.map((item) => ({ value: item.streamId || item.id, label: item.name }))} optional /><label className="block space-y-1 text-sm font-medium text-gray-700"><span>Academic year</span><input required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="w-full rounded-md border px-3 py-2" /></label><div className="border-t pt-3 text-sm text-gray-600"><p>Selected: <strong>{selectedStudents.length}</strong></p><p className="mt-1">Destination: <strong>{targetClassId ? className(targetClassId) : "-"}</strong></p></div><button disabled={saving || !selectedStudents.length || !targetClassId} onClick={executePromotion} className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><ArrowRight size={16} />{saving ? "Promoting..." : "Promote Selected"}</button></aside>
      </div>
      <section className="border bg-white"><h2 className="flex items-center gap-2 border-b px-4 py-3 font-semibold"><History size={17} /> Recent Promotion History</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Batch</th></tr></thead><tbody className="divide-y">{history.slice(0, 100).map((item) => <tr key={item.id}><td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td><td className="px-4 py-3"><p className="font-medium">{item.studentName}</p><p className="text-xs text-gray-500">{item.studentId}</p></td><td className="px-4 py-3">{className(item.fromClassId)}<p className="text-xs text-gray-500">{streamName(item.fromStreamId)}</p></td><td className="px-4 py-3">{className(item.toClassId)}<p className="text-xs text-gray-500">{streamName(item.toStreamId)} | {item.toAcademicYear}</p></td><td className="px-4 py-3 text-xs text-gray-500">{item.batchId}</td></tr>)}{!history.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No promotion history yet.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function Select({ label, value, onChange, options, optional = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; optional?: boolean }) {
  return <label className="block space-y-1 text-sm font-medium text-gray-700"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border px-3 py-2"><option value="">{optional ? "No specific stream" : "Select an option"}</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}
