import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { TENANT_ID } from "../../src/config/tenant";
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
  const [questions, setQuestions] = useState<{ question: string; answer: string; options: string[]; questionType: string }[]>([]);
  const [editing, setEditing] = useState<TeacherAssignment | null>(null);
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
          tenantId: TENANT_ID,
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim(),
          classId,
          dueDate: new Date(`${dueDate}T23:59:59`).toISOString(),
          type,
          teacherId: user.uid,
          questions: questions.map(item => ({ ...item, options: item.options.filter(Boolean) })),
        },
      });
      setTitle("");
      setSubject("");
      setDescription("");
      setDueDate("");
      setQuestions([]);
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

  const saveEdit = async () => {
    if (!editing || !user) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await queueWrite({ path: `assignments/${editing.id}`, type: "set", merge: true, data: { tenantId: TENANT_ID, title: editing.title.trim(), description: editing.description.trim(), dueDate: editing.dueDate, questions: (editing.questions || []).map((item, index) => ({ ...item, number: index + 1, options: item.options.filter(Boolean) })) } });
      setEditing(null); setMessage(result === "synced" ? "Assignment updated." : "Assignment update saved offline and queued."); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update assignment."); } finally { setSaving(false); }
  };

  return (
    <TeacherPageShell subtitle="Create coursework and review assignments already issued to your classes." title="Assignments">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <Text className="text-lg font-extrabold text-slate-900">Create assignment</Text>
        <TextInput className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setTitle} placeholder="Title" placeholderTextColor="#94a3b8" value={title} />
        <TextInput className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#94a3b8" value={subject} />
        <TextInput className="mt-3 min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900" multiline onChangeText={setDescription} placeholder="Description" placeholderTextColor="#94a3b8" textAlignVertical="top" value={description} />
        <TextInput className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setDueDate} placeholder="Due date: YYYY-MM-DD" placeholderTextColor="#94a3b8" value={dueDate} />
        <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Class</Text>
        <View className="mt-2 flex-row flex-wrap">
          {classes.map((item) => (
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === item.classId ? "bg-emerald-700" : "bg-slate-100"}`} key={item.id} onPress={() => setClassId(item.classId)}>
              <Text className={`text-sm font-bold ${classId === item.classId ? "text-white" : "text-slate-700"}`}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        {(type === "objective" || type === "short-answer") && <View className="mt-4 rounded-2xl bg-slate-50 p-4"><View className="flex-row items-center justify-between"><Text className="text-xs font-bold uppercase tracking-widest text-slate-500">Test questions</Text><Pressable onPress={() => setQuestions(current => [...current, { question: "", answer: "", options: ["", "", "", ""], questionType: type === "objective" ? "multiple-choice" : "short-answer" }])} className="rounded-xl bg-sky-700 px-3 py-2"><Text className="text-xs font-bold text-white">+ Add question</Text></Pressable></View>{questions.map((item, index) => <View key={index} className="mt-3 rounded-xl border border-slate-200 bg-white p-3"><Text className="font-bold text-slate-700">Question {index + 1}</Text><TextInput className="mt-2 rounded-xl border border-slate-200 px-3 py-3" onChangeText={value => setQuestions(current => current.map((question, position) => position === index ? { ...question, question: value } : question))} placeholder={`Question ${index + 1}`} value={item.question} /><TextInput className="mt-2 rounded-xl border border-slate-200 px-3 py-3" onChangeText={value => setQuestions(current => current.map((question, position) => position === index ? { ...question, answer: value } : question))} placeholder="Correct answer" value={item.answer} /></View>)}{!questions.length && <Text className="mt-3 text-sm text-slate-500">Add multiple questions to create a test.</Text>}</View>}
        <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Type</Text>
        <View className="mt-2 flex-row flex-wrap">
          {["essay", "short-answer", "objective", "file", "project"].map((item) => (
            <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${type === item ? "bg-sky-700" : "bg-slate-100"}`} key={item} onPress={() => setType(item)}>
              <Text className={`text-sm font-bold capitalize ${type === item ? "text-white" : "text-slate-700"}`}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-4 text-xs text-slate-500">After saving, the form clears so you can create another test or assignment immediately.</Text>
        <Pressable className="mt-3 items-center rounded-2xl bg-emerald-700 px-4 py-4 active:bg-emerald-800" disabled={saving} onPress={create}>
          <Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Save and add another"}</Text>
        </Pressable>
      </View>
      {!!editing && <View className="mt-6 rounded-3xl border-2 border-primary/20 bg-blue-50 p-5"><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="text-lg font-extrabold text-slate-900">Edit assignment</Text><Text className="mt-1 text-sm text-slate-600">Update instructions and questions.</Text></View><Pressable onPress={() => setEditing(null)} className="rounded-xl bg-white px-3 py-2"><Text className="font-bold text-slate-700">Cancel</Text></Pressable></View><TextInput className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900" value={editing.title} onChangeText={value => setEditing({ ...editing, title: value })} placeholder="Assignment title" /><TextInput multiline textAlignVertical="top" className="mt-3 min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-6 text-slate-900" value={editing.description} onChangeText={value => setEditing({ ...editing, description: value })} placeholder="Instructions / description" />{(editing.questions || []).map((question, index) => <View key={index} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><Text className="font-bold text-slate-700">Question {index + 1}</Text><TextInput multiline textAlignVertical="top" className="mt-3 min-h-24 rounded-xl border border-slate-200 px-3 py-3 text-base" value={question.question} onChangeText={value => setEditing({ ...editing, questions: editing.questions?.map((item, position) => position === index ? { ...item, question: value } : item) })} placeholder="Question text" /><TextInput className="mt-3 rounded-xl border border-slate-200 px-3 py-3 text-base" value={question.answer} onChangeText={value => setEditing({ ...editing, questions: editing.questions?.map((item, position) => position === index ? { ...item, answer: value } : item) })} placeholder="Correct answer" />{question.options.map((option, optionIndex) => <TextInput key={optionIndex} className="mt-3 rounded-xl border border-slate-200 px-3 py-3 text-base" value={option} onChangeText={value => setEditing({ ...editing, questions: editing.questions?.map((item, position) => position === index ? { ...item, options: item.options.map((entry, choice) => choice === optionIndex ? value : entry) } : item) })} placeholder={`Option ${optionIndex + 1}`} />)}</View>)}<Pressable onPress={() => setEditing({ ...editing, questions: [...(editing.questions || []), { question: "", answer: "", options: ["", "", "", ""], questionType: "multiple-choice", number: (editing.questions || []).length + 1 }] })} className="mt-4 rounded-2xl border-2 border-dashed border-primary p-4"><Text className="text-center font-bold text-primary">+ Add question</Text></Pressable><Pressable disabled={saving} onPress={() => void saveEdit()} className="mt-4 rounded-2xl bg-primary p-4"><Text className="text-center font-bold text-white">{saving ? "Saving..." : "Save assignment changes"}</Text></Pressable></View>}
      <Text className="mt-7 text-lg font-extrabold text-slate-900">Existing assignments</Text>
      {!loading && !assignments.length && !error && <Text className="mt-6 text-center text-sm text-slate-500">No assignments yet.</Text>}
      <View className="mt-3">
        {assignments.map((assignment) => (
          <View className="mb-3 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm" key={assignment.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{assignment.title}</Text>
                <Text className="mt-1 text-sm font-semibold text-emerald-700">{assignment.subject} | {assignment.classId}</Text>
              </View>
              {assignment.pending && <Text className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">Queued</Text>}
            </View>
            {!!assignment.description && <Text className="mt-3 text-sm leading-5 text-slate-600">{assignment.description}</Text>}
            {!!assignment.questions?.length && <Text className="mt-3 text-xs font-bold text-slate-500">{assignment.questions.length} question(s)</Text>}
            <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Due {formatDueDate(assignment.dueDate)} | {assignment.type}</Text>
            {!assignment.pending && <Pressable disabled={saving} onPress={() => setEditing({ ...assignment, questions: assignment.questions || [] })} className="mt-4 items-center rounded-2xl bg-blue-50 px-4 py-3"><Text className="text-sm font-bold text-primary">Edit instructions and questions</Text></Pressable>}
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
