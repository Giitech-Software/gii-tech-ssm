import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import {
  createManagedAccount,
  deleteManagedAccount,
  fetchManagedAccounts,
  updateManagedAccountRole,
  type AccountDirectory,
  type ManagedAccount,
  type ManagedAccountRole,
} from "../../src/services/superAdminAccountService";

const roles: ManagedAccountRole[] = ["student", "parent", "teacher", "admin"];

export default function SuperAdminAccountsPage() {
  const { user, role: currentRole } = useAuth();
  const [accounts, setAccounts] = useState<AccountDirectory | null>(null);
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ManagedAccountRole>("student");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [editing, setEditing] = useState<ManagedAccount | null>(null);
  const [editingRole, setEditingRole] = useState<ManagedAccountRole>("student");
  const [armedDeleteUid, setArmedDeleteUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || currentRole !== "superadmin") return;
    setLoading(true);
    setError("");
    try {
      const [accountResult, directoryResult] = await Promise.all([
        fetchManagedAccounts(user.uid),
        fetchAdminDirectory(user.uid),
      ]);
      setAccounts(accountResult);
      setDirectory(directoryResult.data);
      setOffline(accountResult.source === "cache" || directoryResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load account management.");
    } finally {
      setLoading(false);
    }
  }, [currentRole, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (accounts?.accounts || []).filter((account) =>
      (filter === "all" || account.role === filter) &&
      (!term || `${account.displayName} ${account.id} ${account.email}`.toLowerCase().includes(term))
    );
  }, [accounts, filter, search]);

  const resetForm = () => {
    setId("");
    setDisplayName("");
    setPassword("");
    setRole("student");
    setClassId("");
    setStreamId("");
    setDepartmentId("");
    setSubject("");
  };

  const create = async () => {
    if (!displayName.trim() || password.length < 6) {
      setError("Enter a full name and a temporary password with at least 6 characters.");
      return;
    }
    if (offline) {
      setError("Connect to the internet before provisioning a Firebase Auth account.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const account = await createManagedAccount({
        id: id.trim() || undefined,
        displayName: displayName.trim(),
        password,
        role,
        extra: { classId, streamId, departmentId, subject: subject.trim() },
      });
      resetForm();
      await load();
      setMessage(`${account.role} account created. Login ID: ${account.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create this account.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (account: ManagedAccount) => {
    if (!roles.includes(account.role as ManagedAccountRole)) return;
    setEditing(account);
    setEditingRole(account.role as ManagedAccountRole);
    setArmedDeleteUid("");
  };

  const saveRole = async () => {
    if (!editing || offline) return setError("Connect to the internet before changing account roles.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateManagedAccountRole(editing.uid, editingRole);
      setEditing(null);
      await load();
      setMessage(`${editing.displayName} now has the ${editingRole} role.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update this role.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (account: ManagedAccount) => {
    if (offline) return setError("Connect to the internet before deleting an account.");
    if (armedDeleteUid !== account.uid) {
      setArmedDeleteUid(account.uid);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteManagedAccount(account.uid);
      setEditing(null);
      setArmedDeleteUid("");
      await load();
      setMessage(`${account.displayName}'s account was deleted.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to delete this account.");
    } finally {
      setSaving(false);
    }
  };

  if (currentRole !== "superadmin") {
    return <AdminPageShell subtitle="Only the main super admin can provision and manage login accounts." title="Account management"><Text className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Super-admin access is required.</Text></AdminPageShell>;
  }

  return (
    <AdminPageShell subtitle="Provision Firebase login accounts and maintain role-based access. Account changes require an internet connection." title="Account management">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-3xl bg-white p-5">
        <Text className="text-lg font-extrabold text-slate-900">Create login account</Text>
        <TextInput autoCapitalize="characters" className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base" onChangeText={setId} placeholder="Login ID (optional, auto-generated if blank)" placeholderTextColor="#94a3b8" value={id} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base" onChangeText={setDisplayName} placeholder="Full name" placeholderTextColor="#94a3b8" value={displayName} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base" onChangeText={setPassword} placeholder="Temporary password" placeholderTextColor="#94a3b8" secureTextEntry value={password} />
        <Label>Role</Label><Choices options={roles} selected={role} setSelected={(value) => setRole(value as ManagedAccountRole)} />
        {role === "student" && <><Label>Class</Label><Choices options={(directory?.classes || []).map((item) => item.classId || item.id)} labels={(directory?.classes || []).map((item) => item.name)} selected={classId} setSelected={(value) => { setClassId(value); setStreamId(""); }} /><Label>Stream</Label><Choices options={(directory?.streams || []).filter((item) => !classId || item.classId === classId).map((item) => item.streamId || item.id)} labels={(directory?.streams || []).filter((item) => !classId || item.classId === classId).map((item) => item.name)} selected={streamId} setSelected={setStreamId} /></>}
        {role === "teacher" && <><Label>Department</Label><Choices options={(directory?.departments || []).map((item) => item.id)} labels={(directory?.departments || []).map((item) => item.name)} selected={departmentId} setSelected={setDepartmentId} /><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base" onChangeText={setSubject} placeholder="Primary subject" placeholderTextColor="#94a3b8" value={subject} /></>}
        <Pressable className="mt-4 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving || offline} onPress={create}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : offline ? "Connect to create account" : "Create account"}</Text></Pressable>
      </View>
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Account directory</Text>
      <TextInput autoCapitalize="none" className="mt-3 rounded-2xl bg-white px-4 py-4 text-base" onChangeText={setSearch} placeholder="Search name, ID, or email" placeholderTextColor="#94a3b8" value={search} />
      <Choices options={["all", ...roles]} selected={filter} setSelected={setFilter} />
      {filtered.map((account) => <View className="mt-3 rounded-3xl bg-white p-5" key={account.uid}><Text className="text-base font-extrabold text-slate-900">{account.displayName}</Text><Text className="mt-1 text-xs font-semibold text-slate-500">{account.id} | {account.email}</Text><Text className="mt-3 text-sm capitalize text-slate-600">{account.role}</Text>{roles.includes(account.role as ManagedAccountRole) ? <Pressable className="mt-3 items-center rounded-2xl bg-indigo-100 px-4 py-3" onPress={() => beginEdit(account)}><Text className="text-sm font-bold text-indigo-800">Manage role</Text></Pressable> : <Text className="mt-3 text-xs font-bold uppercase text-slate-500">Protected account</Text>}</View>)}
      {!loading && !filtered.length && <Text className="mt-5 text-center text-sm text-slate-500">No matching accounts found.</Text>}
      {!!editing && <View className="mt-5 rounded-3xl border border-indigo-100 bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">Manage {editing.displayName}</Text><Text className="mt-1 text-xs text-slate-500">{editing.id}</Text><Label>Access role</Label><Choices options={roles} selected={editingRole} setSelected={(value) => setEditingRole(value as ManagedAccountRole)} /><Text className="mt-2 text-xs leading-5 text-slate-500">Historical student or staff profiles are retained when access changes so academic records remain intact.</Text><View className="mt-4 flex-row"><Pressable className="mr-2 flex-1 items-center rounded-2xl bg-slate-100 px-3 py-4" onPress={() => { setEditing(null); setArmedDeleteUid(""); }}><Text className="text-sm font-bold text-slate-700">Cancel</Text></Pressable><Pressable className="flex-1 items-center rounded-2xl bg-indigo-700 px-3 py-4" disabled={saving || offline} onPress={saveRole}><Text className="text-sm font-bold text-white">Save role</Text></Pressable></View><Pressable className={`mt-3 items-center rounded-2xl px-3 py-4 ${armedDeleteUid === editing.uid ? "bg-red-700" : "bg-red-50"}`} disabled={saving || offline} onPress={() => remove(editing)}><Text className={`text-sm font-bold ${armedDeleteUid === editing.uid ? "text-white" : "text-red-700"}`}>{armedDeleteUid === editing.uid ? "Tap again to permanently delete" : "Delete account"}</Text></Pressable></View>}
    </AdminPageShell>
  );
}

function Label({ children }: { children: React.ReactNode }) { return <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">{children}</Text>; }
function Choices({ options, labels, selected, setSelected }: { options: readonly string[]; labels?: readonly string[]; selected: string; setSelected: (value: string) => void }) { return <View className="mt-2 flex-row flex-wrap">{options.map((item, index) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${selected === item ? "bg-indigo-700" : "bg-slate-100"}`} key={item} onPress={() => setSelected(item)}><Text className={`text-sm font-bold capitalize ${selected === item ? "text-white" : "text-slate-700"}`}>{labels?.[index] || item}</Text></Pressable>)}</View>; }
