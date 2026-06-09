import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  fetchStudentAttendance,
  type StudentAttendance,
} from "../../src/services/studentDetailService";

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchStudentAttendance(user.uid);
      setAttendance(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const presentDays = useMemo(
    () => attendance.filter((record) => record.status === "Present").length,
    [attendance]
  );
  const attendanceRate = attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0;

  return (
    <StudentPageShell subtitle="Review your daily attendance history and overall rate." title="Attendance">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <View className="mt-5 rounded-3xl bg-emerald-700 p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-emerald-100">
          Attendance rate
        </Text>
        <Text className="mt-2 text-4xl font-black text-white">{attendanceRate}%</Text>
        <Text className="mt-1 text-sm text-emerald-100">
          Present for {presentDays} of {attendance.length} recorded days
        </Text>
      </View>
      {!loading && !attendance.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">
          No attendance records found yet.
        </Text>
      )}
      <View className="mt-4">
        {attendance.map((record) => (
          <View
            className="mb-3 flex-row items-center justify-between rounded-3xl border border-slate-200 bg-white p-5"
            key={record.id}
          >
            <View>
              <Text className="text-base font-extrabold text-slate-900">{record.date}</Text>
              {!!record.className && <Text className="mt-1 text-sm text-slate-500">{record.className}</Text>}
            </View>
            <Text
              className={`rounded-full px-3 py-2 text-xs font-bold ${
                record.status === "Present"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {record.status}
            </Text>
          </View>
        ))}
      </View>
    </StudentPageShell>
  );
}
