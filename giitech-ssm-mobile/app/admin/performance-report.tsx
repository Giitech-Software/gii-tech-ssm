import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchAdminAnalytics, type AdminAnalyticsData } from "../../src/services/adminAnalyticsService";

export default function AdminPerformanceReportPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminAnalytics(user.uid);
      setData(result);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load performance report.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.students || [])
      .filter((student) => student.gradeCount)
      .filter((student) => !classId || student.classId === classId)
      .filter((student) => !term || `${student.studentName} ${student.studentId}`.toLowerCase().includes(term))
      .sort((left, right) => right.averageGrade - left.averageGrade);
  }, [classId, data, search]);

  return (
    <AdminPageShell
      subtitle="Analyze class averages and recorded student academic performance."
      title="Performance report"
    >
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!data && (
        <>
          <View className="mt-5 flex-row flex-wrap justify-between">
            <Metric label="School average" value={`${data.totals.averageGrade.toFixed(1)}%`} />
            <Metric label="Students graded" value={String(students.length)} />
          </View>
          <Text className="mt-6 text-lg font-extrabold text-slate-900">Class performance</Text>
          {data.classes.map((item) => (
            <Pressable
              className={`mt-3 rounded-3xl border p-5 ${classId === item.classId ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}
              key={item.classId}
              onPress={() => setClassId(classId === item.classId ? "" : item.classId)}
            >
              <View className="flex-row justify-between">
                <Text className="font-extrabold text-slate-900">{item.className}</Text>
                <Text className="text-xs font-bold text-slate-500">{item.students} students</Text>
              </View>
              <Text className="mt-3 text-sm text-slate-600">Average {item.averageGrade.toFixed(1)}%</Text>
            </Pressable>
          ))}
          <TextInput
            autoCapitalize="none"
            className="mt-5 rounded-2xl bg-white px-4 py-4 text-base"
            onChangeText={setSearch}
            placeholder="Search student name or ID"
            placeholderTextColor="#94a3b8"
            value={search}
          />
          {students.map((student) => (
            <View className="mt-3 rounded-3xl bg-white p-5" key={student.studentId}>
              <View className="flex-row justify-between">
                <View className="mr-3 flex-1">
                  <Text className="font-extrabold text-slate-900">{student.studentName}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{student.studentId} | {student.className}</Text>
                </View>
                <Text className="font-black text-indigo-800">{student.averageGrade.toFixed(1)}%</Text>
              </View>
              <Text className="mt-3 text-sm text-slate-600">{student.gradeCount} recorded grades</Text>
            </View>
          ))}
          {!loading && !students.length && <Text className="mt-5 text-center text-sm text-slate-500">No recorded performance data found.</Text>}
        </>
      )}
    </AdminPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 w-[48%] rounded-3xl bg-white p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-3 text-xl font-black text-slate-900">{value}</Text>
    </View>
  );
}
