import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  fetchTeacherAssignments,
  fetchTeacherSubmissions,
  type TeacherAssignment,
  type TeacherSubmission,
} from "../../src/services/teacherService";

export default function TeacherAssessmentSummaryPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
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
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load assessment summaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const scores = submissions.map(item => item.score).filter((score): score is number => score !== null);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const questionStats = useMemo(() => {
    const stats = new Map<string, { correct: number; total: number }>();
    submissions.forEach(item => item.responses.forEach(response => {
      const current = stats.get(response.question) || { correct: 0, total: 0 };
      current.total += 1;
      if (response.correct) current.correct += 1;
      stats.set(response.question, current);
    }));
    return [...stats.entries()].map(([question, value]) => ({ question, ...value, rate: Math.round(value.correct / value.total * 100) })).sort((a, b) => a.rate - b.rate);
  }, [submissions]);

  return (
    <TeacherPageShell title="Assessment summary" subtitle="Review performance across your assignments and quizzes.">
      <View className="mt-5 flex-row flex-wrap justify-between">
        {[['Assessments', assignments.length], ['Submissions', submissions.length], ['Average score', `${average}%`]].map(([label, value]) => (
          <View key={String(label)} className="mb-3 w-[31%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Text className="text-xs font-bold uppercase text-slate-500">{label}</Text><Text className="mt-2 text-2xl font-black text-primary">{value}</Text></View>
        ))}
      </View>
      {error && <Text className="mt-3 rounded-2xl bg-red-50 p-4 text-red-700">{error}</Text>}
      <Pressable onPress={() => void load()} className="mt-2 self-start rounded-xl bg-white px-4 py-3 shadow-sm"><Text className="font-bold text-primary">{loading ? "Refreshing..." : "Refresh"}</Text></Pressable>
      <View className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><Text className="text-lg font-black text-slate-900">Assessment performance</Text>{assignments.map(assignment => { const rows = submissions.filter(item => item.assignmentId === assignment.id); const values = rows.map(item => item.score).filter((score): score is number => score !== null); const avg = values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : 0; return <View key={assignment.id} className="mt-4 border-b border-slate-100 pb-4"><Text className="font-bold text-slate-900">{assignment.title}</Text><Text className="mt-1 text-sm text-slate-500">{assignment.classId || "Class not assigned"} · {rows.length} submissions</Text><Text className="mt-2 font-bold text-primary">{values.length ? `${avg}% average · ${Math.min(...values)}–${Math.max(...values)}% range` : "Not scored"}</Text></View>; })}{!assignments.length && !loading && <Text className="mt-4 text-slate-500">No assessments found.</Text>}</View>
      <View className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><Text className="text-lg font-black text-slate-900">Question performance</Text>{questionStats.map(item => <View key={item.question} className="mt-4"><View className="flex-row justify-between"><Text className="mr-3 flex-1 text-sm text-slate-700" numberOfLines={2}>{item.question}</Text><Text className={`font-bold ${item.rate < 50 ? "text-red-600" : "text-emerald-700"}`}>{item.rate}%</Text></View><View className="mt-2 h-2 rounded-full bg-slate-100"><View className={`h-2 rounded-full ${item.rate < 50 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${item.rate}%` }} /></View></View>)}{!questionStats.length && <Text className="mt-4 text-slate-500">Question-level results appear after quiz responses are submitted.</Text>}</View>
    </TeacherPageShell>
  );
}
