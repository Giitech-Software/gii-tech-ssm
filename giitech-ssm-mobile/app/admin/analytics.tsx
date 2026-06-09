import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { currency } from "../../src/services/adminFinanceService";
import { fetchAdminAnalytics, type AdminAnalyticsData } from "../../src/services/adminAnalyticsService";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { if (!user) return; setLoading(true); setError(""); try { const result = await fetchAdminAnalytics(user.uid); setData(result); setOffline(result.source === "cache"); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load school analytics."); } finally { setLoading(false); } }, [user]);
  useEffect(() => { void load(); }, [load]);
  const students = useMemo(() => (data?.students || []).filter((student) => (!classId || student.classId === classId) && (!search.trim() || `${student.studentName} ${student.studentId}`.toLowerCase().includes(search.trim().toLowerCase()))), [classId, data, search]);
  return <AdminPageShell subtitle="Compare academic, attendance, and finance indicators, then open a detailed student record." title="Analytics and reports"><StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />{!!data && <><View className="mt-5 flex-row flex-wrap justify-between"><Metric label="Students" value={`${data.totals.activeStudents}/${data.totals.students}`} /><Metric label="Academic average" value={`${data.totals.averageGrade.toFixed(1)}%`} /><Metric label="Attendance" value={`${data.totals.attendanceRate}%`} /><Metric label="Outstanding" value={currency(data.totals.outstandingBalance)} /><Metric label="Released reports" value={String(data.totals.releasedReports)} /></View><Text className="mt-6 text-lg font-extrabold text-slate-900">Class comparisons</Text>{data.classes.map((item) => <Pressable className={`mt-3 rounded-3xl border p-5 ${classId === item.classId ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`} key={item.classId} onPress={() => setClassId(classId === item.classId ? "" : item.classId)}><View className="flex-row justify-between"><Text className="font-extrabold text-slate-900">{item.className}</Text><Text className="text-xs font-bold text-slate-500">{item.students} students</Text></View><Text className="mt-3 text-sm text-slate-600">Average {item.averageGrade.toFixed(1)}% | Attendance {item.attendanceRate}%</Text><Text className="mt-1 text-sm text-slate-600">Outstanding {currency(item.outstandingBalance)}</Text></Pressable>)}<Text className="mt-6 text-lg font-extrabold text-slate-900">Student reports</Text><TextInput autoCapitalize="none" className="mt-3 rounded-2xl bg-white px-4 py-4 text-base" onChangeText={setSearch} placeholder="Search student name or ID" placeholderTextColor="#94a3b8" value={search} />{students.map((student) => <Pressable className="mt-3 rounded-3xl bg-white p-5" key={student.studentId} onPress={() => router.push({ pathname: "./student-report", params: { studentId: student.studentId } })}><View className="flex-row justify-between"><View className="mr-3 flex-1"><Text className="font-extrabold text-slate-900">{student.studentName}</Text><Text className="mt-1 text-xs text-slate-500">{student.studentId} | {student.className}</Text></View><Text className="font-black text-indigo-800">{student.averageGrade.toFixed(1)}%</Text></View><Text className="mt-3 text-sm text-slate-600">Attendance {student.attendanceRate}% | Balance {currency(student.balance)}</Text><Text className="mt-1 text-xs font-bold text-indigo-700">Open detailed report</Text></Pressable>)}</>}</AdminPageShell>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View className="mb-3 w-[48%] rounded-3xl bg-white p-4"><Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Text><Text className="mt-3 text-xl font-black text-slate-900">{value}</Text></View>; }
