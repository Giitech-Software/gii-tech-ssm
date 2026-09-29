import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchAdminFamilyReports, type AdminFamilyReportData } from "../../src/services/adminFamilyReportService";

export default function AdminReportCardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<AdminFamilyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminFamilyReports(user.uid);
      setData(result);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report cards.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const reports = data?.reports.filter((report) => report.published) || [];

  return (
    <AdminPageShell
      subtitle="Generate and review released student report cards by term."
      title="Student report cards"
    >
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <Pressable
        className="mt-5 items-center rounded-2xl bg-primary px-4 py-4 active:bg-primary"
        onPress={() => router.push("./report-publishing")}
      >
        <Text className="text-sm font-bold text-white">Publish a report card</Text>
      </Pressable>
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Released report cards</Text>
      {reports.map((report) => (
        <View className="mt-3 rounded-3xl bg-white p-5" key={report.id}>
          <View className="flex-row justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-base font-extrabold text-slate-900">{report.studentName}</Text>
              <Text className="mt-1 text-xs text-slate-500">{report.studentId} | {report.className}</Text>
            </View>
            <Text className="font-black text-primary">{report.averageGrade.toFixed(1)}%</Text>
          </View>
          <Text className="mt-3 text-sm text-slate-600">
            {report.term} | {report.academicYear} | {report.subjects.length} subjects
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            Attendance {report.attendance.present}/{report.attendance.total}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-700">GPA / points: {report.gpa?.toFixed(2) || "-"}</Text>
          <Text className="mt-1 text-sm text-slate-600">Class position: {report.positions?.class ? `${report.positions.class.position} of ${report.positions.class.total}` : "-"} · Stream: {report.positions?.stream ? `${report.positions.stream.position} of ${report.positions.stream.total}` : "-"}</Text>
          <Text className="mt-1 text-sm text-slate-600">Department: {report.positions?.department ? `${report.positions.department.position} of ${report.positions.department.total}` : "-"} · Overall: {report.positions?.overall ? `${report.positions.overall.position} of ${report.positions.overall.total}` : "-"}</Text>
          <View className="mt-4 border-t border-slate-100 pt-3"><Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject results</Text>{report.subjects.map(subject => <View className="mt-2 flex-row justify-between" key={subject.name}><Text className="flex-1 text-sm text-slate-700">{subject.name}</Text><Text className="text-xs text-slate-500">Class {subject.classScore ?? "-"} · Exam {subject.examScore ?? "-"} · Final {subject.finalScore ?? subject.mark}</Text></View>)}</View>
          {!!report.interests && <Text className="mt-3 text-sm text-slate-600">Interests: {report.interests}</Text>}
          {!!report.conductRemark && <Text className="mt-1 text-sm text-slate-600">Conduct: {report.conductRemark}</Text>}
          {!!report.attendanceRemark && <Text className="mt-1 text-sm text-slate-600">Attendance remark: {report.attendanceRemark}</Text>}
          {!!report.nextSteps && <Text className="mt-1 text-sm text-slate-600">Next steps: {report.nextSteps}</Text>}
          {report.pending && <Text className="mt-2 text-xs font-bold uppercase text-amber-700">Queued</Text>}
        </View>
      ))}
      {!loading && !reports.length && <Text className="mt-5 text-center text-sm text-slate-500">No released report cards found.</Text>}
    </AdminPageShell>
  );
}
