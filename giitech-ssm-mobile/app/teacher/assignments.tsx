import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  assignmentDocumentId,
  fetchTeacherAssignments,
  fetchTeacherClasses,
  type TeacherAssignment,
  type TeacherClass,
} from "../../src/services/teacherService";

function formatDueDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : "No due date";
}

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState("essay");
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
      const [assignmentResult, classResult] = await Promise.all([
        fetchTeacherAssignments(user.uid),
        fetchTeacherClasses(user.uid),
      ]);
      setAssignments(assignmentResult.data);
      setClasses(classResult.data);
      setOffline(assignmentResult.source === "cache" || classResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!user || !title.trim() || !subject.trim() || !classId || !dueDate) {
      setError("Enter a title, subject, class, and due date.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await queueWrite({
        path: `assignments/${assignmentDocumentId(user.uid)}`,
        type: "set",
        merge: false,
        serverTimestampFields: ["createdAt"],
        data: {
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim(),
          classId,
          dueDate: new Date(`${dueDate}T23:59:59`).toISOString(),
          type,
          teacherId: user.uid,
          questions: [],
        },
      });
      setTitle("");
      setSubject("");
      setDescription("");
      setDueDate("");
      setMessage(result === "synced" ? "Assignment created." : "Assignment saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (assignmentId: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await queueWrite({ path: `assignments/${assignmentId}`, type: "delete" });
      setMessage(result === "synced" ? "Assignment removed." : "Removal saved offline and queued.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherPageShell subtitle="Create coursework and review assignments already issued to your classes." title="Assignments">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-3xl border border-emerald-100 bg-white p-5">
        <Text className="text-lg font-extrabold text-slate-900">Create assignment</Text>
        <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setTitle} placeholder="Title" placeholderTextColor="#94a3b8" value={title} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#94a3b8" value={subject} />
        <TextInput className="mt-3 min-h-20 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" multiline onChangeText={setDescription} placeholder="Description" placeholderTextColor="#94a3b8" textAlignVertical="top" value={description} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setDueDate} placeholder="Due date: YYYY-MM-DD" placeholderTextColor="#94a3b8" value={dueDate} />
        <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Class</Text>
        <View className="mt-2 flex-row flex-wrap">
          {classes.map((item) => (
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === item.classId ? "bg-emerald-700" : "bg-slate-100"}`} key={item.id} onPress={() => setClassId(item.classId)}>
              <Text className={`text-sm font-bold ${classId === item.classId ? "text-white" : "text-slate-700"}`}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Type</Text>
        <View className="mt-2 flex-row flex-wrap">
          {["essay", "short-answer", "objective", "file", "project"].map((item) => (
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${type === item ? "bg-sky-700" : "bg-slate-100"}`} key={item} onPress={() => setType(item)}>
              <Text className={`text-sm font-bold capitalize ${type === item ? "text-white" : "text-slate-700"}`}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable className="mt-3 items-center rounded-2xl bg-emerald-700 px-4 py-4 active:bg-emerald-800" disabled={saving} onPress={create}>
          <Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Create assignment"}</Text>
        </Pressable>
      </View>
      <Text className="mt-7 text-lg font-extrabold text-slate-900">Existing assignments</Text>
      {!loading && !assignments.length && !error && <Text className="mt-6 text-center text-sm text-slate-500">No assignments yet.</Text>}
      <View className="mt-3">
        {assignments.map((assignment) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={assignment.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{assignment.title}</Text>
                <Text className="mt-1 text-sm font-semibold text-emerald-700">{assignment.subject} | {assignment.classId}</Text>
              </View>
              {assignment.pending && <Text className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">Queued</Text>}
            </View>
            {!!assignment.description && <Text className="mt-3 text-sm leading-5 text-slate-600">{assignment.description}</Text>}
            <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Due {formatDueDate(assignment.dueDate)} | {assignment.type}</Text>
            {assignment.pending ? (
              <Text className="mt-4 text-xs font-semibold text-amber-700">
                Sync this assignment before removing it.
              </Text>
            ) : (
              <Pressable className="mt-4 items-center rounded-2xl bg-red-50 px-4 py-3 active:bg-red-100" disabled={saving} onPress={() => remove(assignment.id)}>
                <Text className="text-sm font-bold text-red-700">Remove assignment</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </TeacherPageShell>
  );
}
