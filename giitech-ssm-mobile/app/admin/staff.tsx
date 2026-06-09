import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  departmentNameFor,
  fetchAdminDirectory,
  type AdminDirectoryData,
  type DirectoryStatus,
  type StaffDirectoryRecord,
} from "../../src/services/adminService";

const statuses: DirectoryStatus[] = ["active", "inactive", "archived"];

export default function AdminStaffPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [editing, setEditing] = useState<StaffDirectoryRecord | null>(null);
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (directory?.staff || []).filter(
      (member) =>
        !term ||
        `${member.displayName} ${member.teacherId} ${member.email}`.toLowerCase().includes(term)
    );
  }, [directory, search]);

  const save = async (profile: StaffDirectoryRecord) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await queueWrite({
        path: `teachers/${profile.id}`,
        type: "set",
        merge: true,
        serverTimestampFields: ["updatedAt"],
        data: {
          displayName: profile.displayName.trim(),
          departmentId: profile.departmentId,
          department: profile.departmentId,
          subject: profile.subject.trim(),
          phone: profile.phone.trim(),
          status: profile.status,
        },
      });
      setEditing(null);
      setMessage(result === "synced" ? "Staff profile updated." : "Staff update saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this staff profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Maintain teaching staff profiles, departments, and operational status." title="Staff directory">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <TextInput autoCapitalize="none" className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900" onChangeText={setSearch} placeholder="Search name, ID, or email" placeholderTextColor="#94a3b8" value={search} />
      {!loading && !filtered.length && !error && <Text className="mt-8 text-center text-sm text-slate-500">No staff profiles found.</Text>}
      <View className="mt-4">
        {filtered.map((member) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={member.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{member.displayName}</Text>
                <Text className="mt-1 text-xs font-semibold text-slate-500">{member.teacherId} | {member.email || "No email"}</Text>
              </View>
              <Text className={`rounded-full px-3 py-2 text-xs font-bold ${member.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{member.status}</Text>
            </View>
            <Text className="mt-3 text-sm text-slate-600">{departmentNameFor(directory?.departments || [], member.departmentId)} | {member.subject || "No subject"}</Text>
            {member.pending && <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued update</Text>}
            <View className="mt-4 flex-row">
              <Pressable className="mr-2 flex-1 items-center rounded-2xl bg-indigo-100 px-3 py-3" onPress={() => setEditing(member)}><Text className="text-sm font-bold text-indigo-800">Edit profile</Text></Pressable>
              {member.status !== "archived" && <Pressable className="flex-1 items-center rounded-2xl bg-red-50 px-3 py-3" disabled={saving} onPress={() => save({ ...member, status: "archived" })}><Text className="text-sm font-bold text-red-700">Archive</Text></Pressable>}
            </View>
          </View>
        ))}
      </View>
      {!!editing && (
        <View className="mt-4 rounded-3xl border border-indigo-100 bg-white p-5">
          <Text className="text-lg font-extrabold text-slate-900">Edit staff profile</Text>
          <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={(value) => setEditing({ ...editing, displayName: value })} placeholder="Full name" placeholderTextColor="#94a3b8" value={editing.displayName} />
          <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={(value) => setEditing({ ...editing, phone: value })} placeholder="Phone" placeholderTextColor="#94a3b8" value={editing.phone} />
          <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={(value) => setEditing({ ...editing, subject: value })} placeholder="Subject" placeholderTextColor="#94a3b8" value={editing.subject} />
          <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Department</Text>
          <View className="mt-2 flex-row flex-wrap">
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!editing.departmentId ? "bg-indigo-700" : "bg-slate-100"}`} onPress={() => setEditing({ ...editing, departmentId: "" })}><Text className={`text-sm font-bold ${!editing.departmentId ? "text-white" : "text-slate-700"}`}>Unassigned</Text></Pressable>
            {directory?.departments.map((item) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${editing.departmentId === item.id ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setEditing({ ...editing, departmentId: item.id })}><Text className={`text-sm font-bold ${editing.departmentId === item.id ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>)}
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
