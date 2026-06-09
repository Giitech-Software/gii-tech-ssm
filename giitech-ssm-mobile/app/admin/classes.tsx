import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { academicDocumentId, departmentNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";

export default function AdminClassesPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
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
      const result = await fetchAdminDirectory(user.uid);
      setDirectory(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load classes.");
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!name.trim() || !departmentId) return setError("Enter a class name and select a department.");
    setSaving(true);
    setError("");
    try {
      const classId = academicDocumentId("CLS");
      const departmentName = departmentNameFor(directory?.departments || [], departmentId);
      const result = await queueWrite({ path: `classes/${classId}`, type: "set", merge: false, serverTimestampFields: ["createdAt"], data: { classId, name: name.trim(), departmentId, departmentName, streams: [] } });
      setName("");
      setDepartmentId("");
      setMessage(result === "synced" ? "Class created." : "Class saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create class.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, classId: string) => {
    if (directory?.students.some((student) => student.classId === classId) || directory?.streams.some((stream) => stream.classId === classId)) return setError("Move students and remove class streams first.");
    setSaving(true);
    try {
      const result = await queueWrite({ path: `classes/${id}`, type: "delete" });
      setMessage(result === "synced" ? "Class removed." : "Removal saved offline and queued.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Create classes under departments and maintain academic placement options." title="Classes">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-3xl border border-indigo-100 bg-white p-5">
        <Text className="text-lg font-extrabold text-slate-900">Add class</Text>
        <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setName} placeholder="Class name" placeholderTextColor="#94a3b8" value={name} />
        <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Department</Text>
        <View className="mt-2 flex-row flex-wrap">{directory?.departments.map((item) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${departmentId === item.id ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setDepartmentId(item.id)}><Text className={`text-sm font-bold ${departmentId === item.id ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>)}</View>
        <Pressable className="mt-3 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving} onPress={create}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Add class"}</Text></Pressable>
      </View>
      <View className="mt-5">{directory?.classes.map((item) => <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={item.id}><Text className="text-lg font-extrabold text-slate-900">{item.name}</Text><Text className="mt-1 text-xs text-slate-500">{item.classId || item.id}</Text><Text className="mt-3 text-sm text-slate-600">{departmentNameFor(directory.departments, item.departmentId)}</Text>{item.pending ? <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued</Text> : <Pressable className="mt-4 items-center rounded-2xl bg-red-50 px-4 py-3" disabled={saving} onPress={() => remove(item.id, item.classId || item.id)}><Text className="text-sm font-bold text-red-700">Remove class</Text></Pressable>}</View>)}</View>
    </AdminPageShell>
  );
}
