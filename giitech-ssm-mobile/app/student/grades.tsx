import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchStudentGrades, type StudentGrade } from "../../src/services/studentDetailService";

export default function StudentGradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchStudentGrades(user.uid);
      setGrades(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load grades.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const average = useMemo(
    () =>
      grades.length
        ? Math.round(grades.reduce((total, grade) => total + grade.percentage, 0) / grades.length)
        : 0,
    [grades]
  );

  return (
    <StudentPageShell subtitle="Track recorded results and teacher feedback." title="My grades">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <View className="mt-5 rounded-3xl bg-sky-700 p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-sky-100">
          Overall average
        </Text>
        <Text className="mt-2 text-4xl font-black text-white">{average}%</Text>
        <Text className="mt-1 text-sm text-sky-100">{grades.length} recorded results</Text>
      </View>
      {!loading && !grades.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No grades found yet.</Text>
      )}
      <View className="mt-4">
        {grades.map((grade) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={grade.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{grade.title}</Text>
                <Text className="mt-1 text-sm font-semibold text-sky-700">{grade.subject}</Text>
              </View>
              <Text className="text-2xl font-black text-slate-900">{grade.percentage}%</Text>
            </View>
            <Text className="mt-3 text-sm text-slate-500">
              Score: {grade.score} / {grade.total}
            </Text>
            {!!grade.feedback && (
              <Text className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                {grade.feedback}
              </Text>
            )}
          </View>
        ))}
      </View>
    </StudentPageShell>
  );
}
