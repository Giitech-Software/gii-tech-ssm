import { Text, View } from "react-native";
import { ParentPageShell } from "../../src/components/ParentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useParentData } from "../../src/hooks/useParentData";

export default function ParentReportsPage() {
  const { data, loading, error, load } = useParentData();

  return (
    <ParentPageShell subtitle="Open term report snapshots released by the school." title="Released reports">
      <StudentDataState error={error} loading={loading} offline={data?.source === "cache"} onRefresh={load} />
      {!loading && !data?.reports.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No released reports are available yet.</Text>
      )}
      <View className="mt-4">
        {data?.reports.map((report) => (
          <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-5" key={report.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{report.studentName}</Text>
                <Text className="mt-1 text-sm text-slate-500">{report.className}</Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold text-indigo-700">{report.term}</Text>
                <Text className="mt-1 text-xs text-slate-500">{report.academicYear}</Text>
              </View>
            </View>
            <View className="mt-4 flex-row">
              <View className="mr-3 flex-1 rounded-2xl bg-indigo-50 p-3">
                <Text className="text-xs font-bold uppercase text-indigo-600">Average</Text>
                <Text className="mt-1 text-xl font-black text-indigo-900">{report.averageGrade.toFixed(1)}%</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-slate-100 p-3">
                <Text className="text-xs font-bold uppercase text-slate-500">Attendance</Text>
                <Text className="mt-1 text-xl font-black text-slate-900">{report.attendance.present}/{report.attendance.total}</Text>
              </View>
            </View>
            <View className="mt-4">
              {report.subjects.map((subject) => (
                <View className="flex-row justify-between border-t border-slate-100 py-3" key={subject.name}>
                  <Text className="text-sm font-semibold text-slate-700">{subject.name}</Text>
                  <Text className="text-sm font-bold text-slate-900">{subject.mark} | {subject.grade}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ParentPageShell>
  );
}
