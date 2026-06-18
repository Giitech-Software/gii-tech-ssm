import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";

const reports = [
  {
    title: "Student reports",
    detail: "Search learners and open full academic, attendance, finance, and release records.",
    route: "./analytics",
  },
  {
    title: "Performance report",
    detail: "Compare class averages and students with recorded academic performance.",
    route: "./performance-report",
  },
  {
    title: "Attendance report",
    detail: "Review attendance rates by class and identify students with attendance concerns.",
    route: "./attendance-report",
  },
  {
    title: "Student report cards",
    detail: "Review released term snapshots and open the publishing workflow.",
    route: "./report-card",
  },
] as const;

export default function AdminReportsPage() {
  const router = useRouter();

  return (
    <AdminPageShell
      subtitle="Access academic and administrative reports from one mobile workspace."
      title="Reports"
    >
      <View className="mt-5">
        {reports.map((report) => (
          <Pressable
            className="mb-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
            key={report.route}
            onPress={() => router.push(report.route)}
          >
            <Text className="text-lg font-extrabold text-slate-900">{report.title}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">{report.detail}</Text>
            <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-indigo-700">
              Open report
            </Text>
          </Pressable>
        ))}
      </View>
    </AdminPageShell>
  );
}
