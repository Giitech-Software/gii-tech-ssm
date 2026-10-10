import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { AdminPageShell } from "../../src/components/AdminPageShell";

const groups = [
  ["Student attendance", "Capture student attendance using a manual register or student identity QR check-in/out.", [["Manual attendance register", "Record the student register by class.", "/admin/take-attendance"], ["Student QR check-in/out", "Scan a QR card or enter the student ID to record attendance once for today.", "/shared/qr-attendance"]]],
  ["Staff attendance", "Review staff self-service check-in and check-out activity.", [["Staff attendance oversight", "Review staff check-ins, verification methods, and movement.", "/admin/staff-attendance-report"]]],
  ["Attendance administration", "Manage identity setup, policies, and reporting.", [["Identity cards and enrollment", "Manage QR cards and face enrollment.", "/admin/face-enrollment"], ["Attendance analytics", "Review attendance trends and summaries.", "/admin/analytics"], ["Attendance policy", "Configure staff verification requirements.", "/admin/staff-attendance-settings"]]],
] as const;

export default function AttendanceWorkspace() {
  return <AdminPageShell title="Attendance workspace" subtitle="Capture student attendance, review staff activity, and manage attendance administration."><View className="mt-5 gap-6">{groups.map(([title, detail, tools]) => <View key={title}><Text className="text-lg font-extrabold text-slate-900">{title}</Text><Text className="mt-1 text-sm text-slate-500">{detail}</Text><View className="mt-3 gap-3">{tools.map(([toolTitle, toolDetail, route]) => <Pressable key={route} onPress={() => router.push(route)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm active:border-primary"><Text className="text-base font-extrabold text-slate-900">{toolTitle}</Text><Text className="mt-2 text-sm leading-5 text-slate-500">{toolDetail}</Text><Text className="mt-4 font-bold text-primary">Open -&gt;</Text></Pressable>)}</View></View>)}</View></AdminPageShell>;
}
