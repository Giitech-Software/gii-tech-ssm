import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  fetchTeacherAssignments,
  fetchTeacherSubmissions,
  findTeacherSubmission,
  type TeacherAssignment,
  type TeacherSubmission,
} from "../../src/services/teacherService";

export default function TeacherGradePage() {
  const { submissionId } = useLocalSearchParams<{ submissionId?: string }>();
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [submission, setSubmission] = useState<TeacherSubmission | null>(null);
  const [assignment, setAssignment] = useState<TeacherAssignment | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || !submissionId) return;
    setLoading(true);
    setError("");
    try {
      const [assignmentResult, submissionResult] = await Promise.all([
        fetchTeacherAssignments(user.uid),
        fetchTeacherSubmissions(user.uid),
      ]);
      const selected = findTeacherSubmission(submissionResult.data, submissionId);
      if (!selected) throw new Error("This submission could not be found.");
      setSubmission(selected);
      setAssignment(assignmentResult.data.find((item) => item.id === selected.assignmentId) || null);
      setScore(selected.score === null ? "" : String(selected.score));
      setFeedback(selected.feedback);
      setOffline(assignmentResult.source === "cache" || submissionResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this submission.");
    } finally {
      setLoading(false);
    }
  }, [submissionId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user || !submission || !assignment) return;
    const mark = Number(score);
    if (!score.trim() || !Number.isFinite(mark) || mark < 0 || mark > 100) {
      setError("Enter a score between 0 and 100.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const cleanedFeedback = feedback.trim();
      const submissionResult = await queueWrite({
        path: `submissions/${submission.id}`,
        type: "set",
        merge: true,
        serverTimestampFields: ["gradedAt", "updatedAt"],
        data: {
          grade: String(mark),
          score: mark,
          feedback: cleanedFeedback,
          status: "graded",
          gradedBy: user.uid,
        },
      });
      const gradeResult = await queueWrite({
        path: `grades/${submission.id}`,
        type: "set",
        merge: true,
        serverTimestampFields: ["updatedAt"],
        data: {
          submissionId: submission.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          studentId: submission.studentId,
          studentName: submission.studentName,
          classId: assignment.classId,
          className: assignment.classId,
          subject: assignment.subject || assignment.title,
          academicYear: assignment.academicYear,
          term: assignment.term,
          termId: assignment.termId,
          teacherId: user.uid,
          mark,
          score: mark,
          total: 100,
          feedback: cleanedFeedback,
        },
      });
      setMessage(
        submissionResult === "synced" && gradeResult === "synced"
          ? "Grade and feedback saved."
          : "Grade and feedback saved offline and queued."
      );
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this grade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherPageShell subtitle="Record a durable result and feedback for this student submission." title="Grade submission">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      {!!submission && (
        <>
          <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
            <Text className="text-lg font-extrabold text-slate-900">{submission.studentName}</Text>
            <Text className="mt-1 text-sm font-semibold text-emerald-700">{submission.assignmentTitle}</Text>
            <Text className="mt-2 text-xs text-slate-500">{submission.studentId} | {submission.classId}</Text>
            {!!submission.responseText && (
              <View className="mt-4 rounded-2xl bg-slate-50 p-4">
                <Text className="text-xs font-bold uppercase text-slate-500">Written response</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-700">{submission.responseText}</Text>
              </View>
            )}
            {!!submission.answers.length && submission.answers.map((answer, index) => (
              <View className="mt-3 rounded-2xl bg-slate-50 p-4" key={`${submission.id}-answer-${index}`}>
                <Text className="text-xs font-bold uppercase text-slate-500">Answer {index + 1}</Text>
                <Text className="mt-2 text-sm text-slate-700">{answer || "No answer"}</Text>
              </View>
            ))}
            {!!submission.responses.length && submission.responses.map((response, index) => (
              <View className="mt-3 rounded-2xl bg-slate-50 p-4" key={`${submission.id}-response-${index}`}>
                <Text className="text-xs font-bold uppercase text-slate-500">Response {index + 1}</Text>
                {!!response.question && <Text className="mt-2 text-sm font-semibold text-slate-700">{response.question}</Text>}
                <Text className="mt-1 text-sm text-slate-600">{response.selected || "No answer"}</Text>
              </View>
            ))}
            {!!submission.submissionUrl && (
              <Pressable className="mt-4 items-center rounded-2xl bg-sky-100 px-4 py-3 active:bg-sky-200" onPress={() => Linking.openURL(submission.submissionUrl)}>
                <Text className="text-sm font-bold text-sky-800">Open uploaded file</Text>
              </Pressable>
            )}
          </View>
          <View className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">Score (%)</Text>
            <TextInput className="mt-2 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" keyboardType="numeric" onChangeText={setScore} placeholder="0 - 100" placeholderTextColor="#94a3b8" value={score} />
            <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Feedback</Text>
            <TextInput className="mt-2 min-h-28 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" multiline onChangeText={setFeedback} placeholder="Write feedback for the student..." placeholderTextColor="#94a3b8" textAlignVertical="top" value={feedback} />
            <Pressable className="mt-4 items-center rounded-2xl bg-emerald-700 px-4 py-4 active:bg-emerald-800" disabled={saving} onPress={save}>
              <Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Save grade and feedback"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </TeacherPageShell>
  );
}
