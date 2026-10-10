import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { classNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import { fetchClassSubjects, saveClassSubjects } from "../../src/services/adminSubjectSetupService";

export default function ClassSubjectsPage() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { void fetchAdminDirectory(user?.uid || "").then(result => setDirectory(result.data)).catch(e => setError(e instanceof Error ? e.message : "Unable to load classes.")).finally(() => setLoading(false)); }, [user]);
  useEffect(() => { if (!classId) { setSubjects([]); return; } void fetchClassSubjects(classId).then(setSubjects).catch(e => setError(e instanceof Error ? e.message : "Unable to load subjects.")); }, [classId]);
  const add = () => { const value = draft.trim(); if (value && !subjects.some(item => item.toLowerCase() === value.toLowerCase())) setSubjects([...subjects, value].sort()); setDraft(""); };
  const save = async () => { if (!user || !classId || !subjects.length) return; setSaving(true); setNotice(""); setError(""); try { await saveClassSubjects(classId, subjects, user.uid); setNotice("Class subject list saved."); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save subject list."); } finally { setSaving(false); } };

  return <AdminPageShell title="Subjects per class" subtitle="Define the required subjects before marks are entered or reports are published."><StudentDataState error={error} loading={loading} offline={false} onRefresh={() => { setLoading(true); void fetchAdminDirectory(user?.uid || "").then(result => setDirectory(result.data)).finally(() => setLoading(false)); }} />{notice && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700">{notice}</Text>}<View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5"><Text className="text-sm font-bold text-slate-700">Class</Text><View className="mt-3 flex-row flex-wrap">{directory?.classes.map(item => { const value = item.classId || item.id; return <Pressable key={item.id} onPress={() => { setClassId(value); setNotice(""); }} className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === value ? "bg-primary" : "bg-slate-100"}`}><Text className={`font-bold ${classId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>; })}</View>{classId && <><Text className="mt-4 text-xs text-slate-500">Editing {classNameFor(directory?.classes || [], classId)}</Text><View className="mt-4 flex-row"><TextInput className="mr-2 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" onChangeText={setDraft} onSubmitEditing={add} placeholder="Add subject e.g. Mathematics" placeholderTextColor="#94a3b8" value={draft} /><Pressable className="rounded-2xl bg-primary px-4 py-3" onPress={add}><Text className="font-bold text-white">Add</Text></Pressable></View><View className="mt-4">{subjects.map(subject => <View key={subject} className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-50 p-4"><Text className="font-semibold text-slate-800">{subject}</Text><Pressable onPress={() => setSubjects(subjects.filter(item => item !== subject))}><Text className="font-bold text-red-600">Remove</Text></Pressable></View>)}</View><Pressable disabled={saving || !subjects.length} onPress={() => void save()} className="mt-4 rounded-2xl bg-primary p-4 disabled:opacity-50"><Text className="text-center font-bold text-white">{saving ? "Saving..." : "Save class subjects"}</Text></Pressable></>}</View></AdminPageShell>;
}
