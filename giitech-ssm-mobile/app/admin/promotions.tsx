import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { classNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import { fetchAdminOperations, nextAcademicYear, promotionBatchId, promotionDocumentId, type AdminOperationsData } from "../../src/services/adminOperationsService";

export default function AdminPromotionsPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [operations, setOperations] = useState<AdminOperationsData | null>(null);
  const [sourceClassId, setSourceClassId] = useState("");
  const [sourceStreamId, setSourceStreamId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetStreamId, setTargetStreamId] = useState("");
  const [academicYear, setAcademicYear] = useState(nextAcademicYear());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [directoryResult, operationsResult] = await Promise.all([fetchAdminDirectory(user.uid), fetchAdminOperations(user.uid)]);
      setDirectory(directoryResult.data);
      setOperations(operationsResult);
      setOffline(directoryResult.source === "cache" || operationsResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load promotion data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const sourceStudents = useMemo(() => (directory?.students || []).filter((student) => student.status === "active" && !!sourceClassId && student.classId === sourceClassId && (!sourceStreamId || student.streamId === sourceStreamId)), [directory, sourceClassId, sourceStreamId]);
  const selectedStudents = sourceStudents.filter((student) => selectedIds.includes(student.id));
  const sourceStreams = directory?.streams.filter((stream) => stream.classId === sourceClassId) || [];
  const targetStreams = directory?.streams.filter((stream) => stream.classId === targetClassId) || [];
  const streamName = (streamId: string) => classNameFor(directory?.streams || [], streamId);
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const promote = async () => {
    if (!user || !selectedStudents.length || !targetClassId || !academicYear.trim()) return setError("Select students, a target class, and an academic year.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const batchId = promotionBatchId();
      let pending = false;
      for (const student of selectedStudents) {
        const profileResult = await queueWrite({ path: `students/${student.id}`, type: "set", merge: true, serverTimestampFields: ["updatedAt"], data: { classId: targetClassId, streamId: targetStreamId, stream: targetStreamId, academicYear: academicYear.trim() } });
        const historyResult = await queueWrite({ path: `promotionHistory/${promotionDocumentId(batchId, student.studentId)}`, type: "set", merge: false, serverTimestampFields: ["createdAt"], data: { batchId, studentId: student.studentId, studentName: student.displayName, fromClassId: student.classId, fromStreamId: student.streamId, toClassId: targetClassId, toStreamId: targetStreamId, fromAcademicYear: student.academicYear, toAcademicYear: academicYear.trim(), promotedBy: user.uid } });
        if (profileResult === "pending" || historyResult === "pending") pending = true;
      }
      setSelectedIds([]);
      setMessage(`${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} promoted${pending ? " and queued for sync" : ""}. Batch: ${batchId}`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to complete this promotion batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Move students into their next placement with durable promotion history." title="Student promotion">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <Picker label="Source class" options={directory?.classes || []} selected={sourceClassId} setSelected={(value) => { setSourceClassId(value); setSourceStreamId(""); setSelectedIds([]); }} />
      <Picker label="Optional source stream" options={sourceStreams} selected={sourceStreamId} setSelected={(value) => { setSourceStreamId(value); setSelectedIds([]); }} optional />
      <View className="mt-4 flex-row"><Pressable className="flex-1 items-center rounded-2xl bg-indigo-100 px-4 py-3" onPress={() => setSelectedIds(selectedIds.length === sourceStudents.length ? [] : sourceStudents.map((student) => student.id))}><Text className="text-sm font-bold text-indigo-800">{selectedIds.length === sourceStudents.length && sourceStudents.length ? "Clear selection" : "Select all students"}</Text></Pressable></View>
      <View className="mt-4">{sourceStudents.map((student) => <Pressable className={`mb-3 rounded-3xl border p-5 ${selectedIds.includes(student.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"}`} key={student.id} onPress={() => toggle(student.id)}><Text className="text-base font-extrabold text-slate-900">{student.displayName}</Text><Text className="mt-1 text-xs text-slate-500">{student.studentId} | {student.academicYear || "Academic year not set"}</Text><Text className="mt-3 text-sm font-bold text-indigo-700">{selectedIds.includes(student.id) ? "Selected" : "Tap to select"}</Text></Pressable>)}</View>
      <View className="mt-3 rounded-3xl border border-indigo-100 bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">Target placement</Text><Picker label="Target class" options={directory?.classes || []} selected={targetClassId} setSelected={(value) => { setTargetClassId(value); setTargetStreamId(""); }} /><Picker label="Optional target stream" options={targetStreams} selected={targetStreamId} setSelected={setTargetStreamId} optional /><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setAcademicYear} placeholder="Academic year" placeholderTextColor="#94a3b8" value={academicYear} /><Text className="mt-4 text-sm text-slate-600">Selected: {selectedStudents.length}</Text><Pressable className="mt-3 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving} onPress={promote}><Text className="text-sm font-bold text-white">{saving ? "Promoting..." : "Promote selected students"}</Text></Pressable></View>
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Recent promotion history</Text>
      {operations?.promotions.slice(0, 30).map((item) => <View className="mt-3 rounded-3xl bg-white p-5" key={item.id}><Text className="text-base font-extrabold text-slate-900">{item.studentName}</Text><Text className="mt-1 text-xs text-slate-500">{item.studentId} | {item.batchId}</Text><Text className="mt-3 text-sm text-slate-600">{classNameFor(directory?.classes || [], item.fromClassId)} to {classNameFor(directory?.classes || [], item.toClassId)}</Text><Text className="mt-1 text-xs text-slate-500">{streamName(item.toStreamId)} | {item.toAcademicYear}</Text>{item.pending && <Text className="mt-2 text-xs font-bold uppercase text-amber-700">Queued</Text>}</View>)}
    </AdminPageShell>
  );
}

function Picker({ label, options, selected, setSelected, optional = false }: { label: string; options: AdminDirectoryData["classes"]; selected: string; setSelected: (value: string) => void; optional?: boolean }) {
  return <View className="mt-4"><Text className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Text><View className="mt-2 flex-row flex-wrap">{optional && <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!selected ? "bg-indigo-700" : "bg-slate-100"}`} onPress={() => setSelected("")}><Text className={`text-sm font-bold ${!selected ? "text-white" : "text-slate-700"}`}>Any stream</Text></Pressable>}{options.map((item) => { const value = item.classId || item.streamId || item.id; return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${selected === value ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setSelected(value)}><Text className={`text-sm font-bold ${selected === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>; })}</View></View>;
}
