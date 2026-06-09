import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  fetchTeacherAssignments,
  fetchTeacherSubmissions,
  type TeacherAssignment,
  type TeacherSubmission,
} from "../../src/services/teacherService";

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString() : "Date unavailable";
}

export default function TeacherSubmissionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [assignmentResult, submissionResult] = await Promise.all([
        fetchTeacherAssignments(user.uid),
        fetchTeacherSubmissions(user.uid),
      ]);
      setAssignments(assignmentResult.data);
      setSubmissions(submissionResult.data);
      setOffline(assignmentResult.source === "cache" || submissionResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => submissions.filter((submission) => !assignmentId || submission.assignmentId === assignmentId),
    [assignmentId, submissions]
  );
  const graded = filtered.filter((submission) => submission.status.toLowerCase() === "graded");
  const average = graded.length
    ? Math.round(graded.reduce((total, submission) => total + (submission.score || 0), 0) / graded.length)
    : 0;

  return (
    <TeacherPageShell subtitle="Review student responses, uploaded work, and grading progress." title="Submissions">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Filter by assignment</Text>
      <View className="mt-2 flex-row flex-wrap">
        <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!assignmentId ? "bg-emerald-700" : "bg-white"}`} onPress={() => setAssignmentId("")}>
          <Text className={`text-sm font-bold ${!assignmentId ? "text-white" : "text-slate-700"}`}>All</Text>
        </Pressable>
        {assignments.filter((assignment) => !assignment.pending).map((assignment) => (
          <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${assignmentId === assignment.id ? "bg-emerald-700" : "bg-white"}`} key={assignment.id} onPress={() => setAssignmentId(assignment.id)}>
            <Text className={`text-sm font-bold ${assignmentId === assignment.id ? "text-white" : "text-slate-700"}`}>{assignment.title}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-4 flex-row justify-between">
        {[
          ["Submissions", filtered.length],
          ["Graded", graded.length],
          ["Average", `${average}%`],
        ].map(([label, value]) => (
          <View className="w-[31%] rounded-2xl bg-white p-3" key={label}>
            <Text className="text-xs font-bold uppercase text-slate-500">{label}</Text>
            <Text className="mt-2 text-xl font-black text-slate-900">{value}</Text>
          </View>
        ))}
      </View>
      {!loading && !filtered.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No submissions found yet.</Text>
      )}
      <View className="mt-4">
        {filtered.map((submission) => (
          <Pressable
            className="mb-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
            key={submission.id}
            onPress={() => router.push(`./grade?submissionId=${submission.id}`)}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{submission.studentName}</Text>
                <Text className="mt-1 text-sm font-semibold text-emerald-700">{submission.assignmentTitle}</Text>
              </View>
              <Text className={`rounded-full px-3 py-2 text-xs font-bold ${submission.status.toLowerCase() === "graded" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {submission.status}
              </Text>
            </View>
            <Text className="mt-3 text-xs text-slate-500">{submission.studentId} | {formatDate(submission.submittedAt)}</Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-slate-700">
                {submission.score === null ? "Not graded" : `${submission.score}%`}
              </Text>
              {submission.pending && <Text className="text-xs font-bold uppercase text-amber-700">Queued</Text>}
            </View>
          </Pressable>
        ))}
      </View>
    </TeacherPageShell>
  );
}
