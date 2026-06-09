import { Text, View } from "react-native";
import { ParentPageShell } from "../../src/components/ParentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useParentData } from "../../src/hooks/useParentData";

export default function ParentPerformancePage() {
  const { data, loading, error, load } = useParentData();

  return (
    <ParentPageShell subtitle="Review recorded marks across your linked student profiles." title="Performance">
      <StudentDataState error={error} loading={loading} offline={data?.source === "cache"} onRefresh={load} />
      {!loading && !data?.grades.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No grades found yet.</Text>
      )}
      <View className="mt-4">
        {data?.grades.map((grade) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={grade.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-base font-extrabold text-slate-900">{grade.studentName}</Text>
                <Text className="mt-1 text-sm font-semibold text-indigo-700">{grade.title}</Text>
                <Text className="mt-1 text-xs text-slate-500">{grade.subject}</Text>
              </View>
              <Text className="text-2xl font-black text-slate-900">{grade.percentage}%</Text>
            </View>
            <Text className="mt-3 text-sm text-slate-500">
              Score: {grade.score} / {grade.total}
            </Text>
          </View>
        ))}
      </View>
    </ParentPageShell>
  );
}
