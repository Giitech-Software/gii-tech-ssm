import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  classNameFor,
  fetchAdminDirectory,
  type AdminDirectoryData,
  type DirectoryStatus,
  type StudentDirectoryRecord,
} from "../../src/services/adminService";

const statuses: DirectoryStatus[] = ["active", "inactive", "archived"];

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [editing, setEditing] = useState<StudentDirectoryRecord | null>(null);
  const [search, setSearch] = useState("");
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (directory?.students || []).filter(
      (student) =>
        !term ||
        `${student.displayName} ${student.studentId} ${student.email}`.toLowerCase().includes(term)
    );
  }, [directory, search]);

  const save = async (profile: StudentDirectoryRecord) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await queueWrite({
        path: `students/${profile.id}`,
        type: "set",
        merge: true,
        serverTimestampFields: ["updatedAt"],
        data: {
          displayName: profile.displayName.trim(),
          classId: profile.classId,
          streamId: profile.streamId,
          stream: profile.streamId,
          gender: profile.gender,
          status: profile.status,
        },
      });
      setEditing(null);
      setMessage(result === "synced" ? "Student profile updated." : "Student update saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Maintain enrollment profiles, class placement, and student status." title="Student directory">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <TextInput autoCapitalize="none" className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900" onChangeText={setSearch} placeholder="Search name, ID, or email" placeholderTextColor="#94a3b8" value={search} />
      {!loading && !filtered.length && !error && <Text className="mt-8 text-center text-sm text-slate-500">No students found.</Text>}
      <View className="mt-4">
        {filtered.map((student) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={student.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{student.displayName}</Text>
                <Text className="mt-1 text-xs font-semibold text-slate-500">{student.studentId} | {student.email || "No email"}</Text>
              </View>
              <Text className={`rounded-full px-3 py-2 text-xs font-bold ${student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{student.status}</Text>
            </View>
            <Text className="mt-3 text-sm text-slate-600">{classNameFor(directory?.classes || [], student.classId)}</Text>
            {!!student.parentId && <Text className="mt-1 text-xs text-slate-500">Parent: {student.parentId}</Text>}
            {student.pending && <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued update</Text>}
            <View className="mt-4 flex-row">
              <Pressable className="mr-2 flex-1 items-center rounded-2xl bg-indigo-100 px-3 py-3" onPress={() => setEditing(student)}>
                <Text className="text-sm font-bold text-indigo-800">Edit profile</Text>
              </Pressable>
              {student.status !== "archived" && (
                <Pressable className="flex-1 items-center rounded-2xl bg-red-50 px-3 py-3" disabled={saving} onPress={() => save({ ...student, status: "archived" })}>
                  <Text className="text-sm font-bold text-red-700">Archive</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>
      {!!editing && (
        <View className="mt-4 rounded-3xl border border-indigo-100 bg-white p-5">
          <Text className="text-lg font-extrabold text-slate-900">Edit student profile</Text>
          <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={(value) => setEditing({ ...editing, displayName: value })} placeholder="Full name" placeholderTextColor="#94a3b8" value={editing.displayName} />
          <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Class</Text>
          <View className="mt-2 flex-row flex-wrap">
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!editing.classId ? "bg-indigo-700" : "bg-slate-100"}`} onPress={() => setEditing({ ...editing, classId: "", streamId: "" })}><Text className={`text-sm font-bold ${!editing.classId ? "text-white" : "text-slate-700"}`}>Unassigned</Text></Pressable>
            {directory?.classes.map((item) => {
              const value = item.classId || item.id;
              return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${editing.classId === value ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setEditing({ ...editing, classId: value, streamId: "" })}><Text className={`text-sm font-bold ${editing.classId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>;
            })}
          </View>
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Stream</Text>
          <View className="mt-2 flex-row flex-wrap">
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!editing.streamId ? "bg-indigo-700" : "bg-slate-100"}`} onPress={() => setEditing({ ...editing, streamId: "" })}><Text className={`text-sm font-bold ${!editing.streamId ? "text-white" : "text-slate-700"}`}>Unassigned</Text></Pressable>
            {directory?.streams.filter((item) => !editing.classId || item.classId === editing.classId).map((item) => {
              const value = item.streamId || item.id;
              return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${editing.streamId === value ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setEditing({ ...editing, streamId: value })}><Text className={`text-sm font-bold ${editing.streamId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>;
            })}
          </View>
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Status</Text>
          <View className="mt-2 flex-row flex-wrap">
            {statuses.map((status) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${editing.status === status ? "bg-slate-800" : "bg-slate-100"}`} key={status} onPress={() => setEditing({ ...editing, status })}><Text className={`text-sm font-bold capitalize ${editing.status === status ? "text-white" : "text-slate-700"}`}>{status}</Text></Pressable>)}
          </View>
          <View className="mt-3 flex-row">
            <Pressable className="mr-2 flex-1 items-center rounded-2xl bg-slate-100 px-3 py-4" onPress={() => setEditing(null)}><Text className="text-sm font-bold text-slate-700">Cancel</Text></Pressable>
            <Pressable className="flex-1 items-center rounded-2xl bg-indigo-700 px-3 py-4" disabled={saving} onPress={() => save(editing)}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Save changes"}</Text></Pressable>
          </View>
        </View>
      )}
    </AdminPageShell>
  );
}
