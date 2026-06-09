import { Children, useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchStudentReportDetail, type StudentReportDetail } from "../../src/services/adminAnalyticsService";
import { currency } from "../../src/services/adminFinanceService";

export default function AdminStudentReportPage() {
  const { studentId = "" } = useLocalSearchParams<{ studentId?: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<StudentReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { if (!user || !studentId) return; setLoading(true); setError(""); try { const result = await fetchStudentReportDetail(user.uid, studentId); setData(result); setOffline(result.source === "cache"); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load this student report."); } finally { setLoading(false); } }, [studentId, user]);
  useEffect(() => { void load(); }, [load]);
  return <AdminPageShell subtitle="Review the full academic, attendance, finance, and released-report record for one student." title="Student report"><StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />{!!data && <><View className="mt-5 rounded-3xl bg-indigo-950 p-5"><Text className="text-xl font-extrabold text-white">{data.student.displayName}</Text><Text className="mt-1 text-xs text-indigo-200">{data.student.studentId} | {data.summary.className}</Text><Text className="mt-4 text-sm font-bold text-white">Academic average: {data.summary.averageGrade.toFixed(1)}%</Text><Text className="mt-1 text-sm text-indigo-100">Attendance: {data.summary.attendancePresent}/{data.summary.attendanceTotal} ({data.summary.attendanceRate}%)</Text><Text className="mt-1 text-sm text-indigo-100">Outstanding balance: {currency(data.summary.balance)}</Text></View><Section title="Recorded grades">{data.grades.map((item) => <Row key={item.id} label={item.subject} value={`${item.mark.toFixed(1)}%`} meta={`${item.term || "No term"} | ${item.academicYear || "No year"}`} />)}</Section><Section title="Attendance history">{data.attendance.map((item) => <Row key={item.id} label={item.date || "Undated attendance"} value={item.status} meta={item.classId} />)}</Section><Section title="Charges">{data.charges.map((item) => <Row key={item.id} label={item.description} value={currency(item.amount)} meta={`${item.term} | ${item.academicYear}`} />)}</Section><Section title="Payments">{data.payments.map((item) => <Row key={item.id} label={item.receiptNumber} value={currency(item.amount)} meta={`${item.paymentMethod} | ${item.term}`} />)}</Section><Section title="Released reports">{data.reports.map((item) => <Row key={item.id} label={`${item.term} | ${item.academicYear}`} value={`${item.averageGrade.toFixed(1)}%`} meta={`${item.subjects.length} subjects | Attendance ${item.attendance.present}/${item.attendance.total}`} />)}</Section></>}</AdminPageShell>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View className="mt-4 rounded-3xl bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">{title}</Text>{Children.count(children) ? children : <Text className="mt-3 text-sm text-slate-500">No records found.</Text>}</View>; }
function Row({ label, value, meta }: { label: string; value: string; meta: string }) { return <View className="mt-3 border-t border-slate-100 pt-3"><View className="flex-row justify-between"><Text className="mr-3 flex-1 font-bold text-slate-800">{label}</Text><Text className="font-black text-indigo-800">{value}</Text></View><Text className="mt-1 text-xs text-slate-500">{meta}</Text></View>; }
