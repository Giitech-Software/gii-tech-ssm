import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { academicDocumentId, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";

export default function AdminDepartmentsPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return setError("Enter a department name.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const id = academicDocumentId("DEPT");
      const result = await queueWrite({ path: `departments/${id}`, type: "set", merge: false, serverTimestampFields: ["createdAt"], data: { id, name: name.trim(), head: head.trim() } });
      setName("");
      setHead("");
      setMessage(result === "synced" ? "Department created." : "Department saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create department.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (directory?.classes.some((item) => item.departmentId === id)) return setError("Move or remove this department's classes first.");
    setSaving(true);
    try {
      const result = await queueWrite({ path: `departments/${id}`, type: "delete" });
      setMessage(result === "synced" ? "Department removed." : "Removal saved offline and queued.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove department.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Define the major academic and operational divisions in the school." title="Departments">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-3xl border border-indigo-100 bg-white p-5">
        <Text className="text-lg font-extrabold text-slate-900">Add department</Text>
        <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setName} placeholder="Department name" placeholderTextColor="#94a3b8" value={name} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setHead} placeholder="Department head" placeholderTextColor="#94a3b8" value={head} />
        <Pressable className="mt-4 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving} onPress={create}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Add department"}</Text></Pressable>
      </View>
      <View className="mt-5">
        {directory?.departments.map((item) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={item.id}>
            <Text className="text-lg font-extrabold text-slate-900">{item.name}</Text>
            <Text className="mt-1 text-xs text-slate-500">{item.id}</Text>
            <Text className="mt-3 text-sm text-slate-600">{item.head || "No department head assigned"}</Text>
            {item.pending ? <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued</Text> : <Pressable className="mt-4 items-center rounded-2xl bg-red-50 px-4 py-3" disabled={saving} onPress={() => remove(item.id)}><Text className="text-sm font-bold text-red-700">Remove department</Text></Pressable>}
          </View>
        ))}
      </View>
    </AdminPageShell>
  );
}
