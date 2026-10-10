import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";

export default function GraduationArchivePage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [classId, setClassId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setDirectory((await fetchAdminDirectory(user.uid)).data);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load classes.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const students = (directory?.students || []).filter((student) => student.classId === classId && student.status !== "archived");
  const className = directory?.classes.find((item) => (item.classId || item.id) === classId)?.name || classId;

  const graduate = async () => {
    if (!user || !classId || !year.trim() || !students.length) {
      setError("Select a class with active students and enter the graduation year.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      for (const student of students) {
        await queueWrite({
          path: `students/${student.id}`,
          type: "set",
          merge: true,
          serverTimestampFields: ["updatedAt", "graduationArchivedAt"],
          data: { status: "archived", lifecycleStatus: "graduated", graduationClassId: classId, graduationYear: year.trim(), graduationArchivedBy: user.uid },
        });
      }
      setNotice(`${students.length} learner${students.length === 1 ? "" : "s"} moved to Graduated / Archive.`);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to archive this graduating class.");
    } finally {
      setSaving(false);
    }
  };

  return <AdminPageShell title="Graduation archive" subtitle="Move a completed class out of active students while retaining its records for future access.">
    <StudentDataState error={error} loading={loading} offline={false} onRefresh={load} />
    {notice && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700">{notice}</Text>}
    <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
      <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">Graduation year</Text>
      <TextInput className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900" value={year} onChangeText={setYear} placeholder="e.g. 2026" />
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Class</Text>
      <View className="mt-2 flex-row flex-wrap">{(directory?.classes || []).map((item) => { const value = item.classId || item.id; return <Pressable key={item.id} onPress={() => setClassId(value)} className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === value ? "bg-primary" : "bg-slate-100"}`}><Text className={`font-bold ${classId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>; })}</View>
      {classId && <Text className="mt-4 text-sm text-slate-600">{className}: {students.length} active learner{students.length === 1 ? "" : "s"}</Text>}
      <Pressable disabled={saving || !students.length} onPress={() => void graduate()} className="mt-5 rounded-2xl bg-primary p-4 disabled:bg-slate-300"><Text className="text-center font-bold text-white">{saving ? "Archiving class..." : "Graduate and archive class"}</Text></Pressable>
    </View>
  </AdminPageShell>;
}
