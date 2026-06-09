import { Text, View } from "react-native";
import { ParentPageShell } from "../../src/components/ParentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useParentData } from "../../src/hooks/useParentData";
import { parentAttendanceRate } from "../../src/services/parentDetailService";

export default function ParentAttendancePage() {
  const { data, loading, error, load } = useParentData();
  const rate = parentAttendanceRate(data?.attendance || []);

  return (
    <ParentPageShell subtitle="Review linked-student attendance records and trends." title="Attendance">
      <StudentDataState error={error} loading={loading} offline={data?.source === "cache"} onRefresh={load} />
      <View className="mt-5 rounded-3xl bg-emerald-700 p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-emerald-100">
          Family attendance rate
        </Text>
        <Text className="mt-2 text-4xl font-black text-white">{rate}%</Text>
        <Text className="mt-1 text-sm text-emerald-100">
          Across {data?.attendance.length || 0} recorded days
        </Text>
      </View>
      {!loading && !data?.attendance.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No attendance records found yet.</Text>
      )}
      <View className="mt-4">
        {data?.attendance.map((record) => (
          <View className="mb-3 flex-row items-center justify-between rounded-3xl border border-slate-200 bg-white p-5" key={record.id}>
            <View>
              <Text className="text-base font-extrabold text-slate-900">{record.studentName}</Text>
              <Text className="mt-1 text-sm text-slate-500">{record.date}</Text>
            </View>
            <Text className={`rounded-full px-3 py-2 text-xs font-bold ${record.status === "Present" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
              {record.status}
            </Text>
          </View>
        ))}
      </View>
    </ParentPageShell>
  );
}
