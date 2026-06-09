import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";

const communicationTools = [
  ["Announcements", "Publish school notices, alerts, and draft announcements.", "./announcements"],
  ["Calendar", "Maintain term dates, exams, holidays, meetings, and activities.", "./calendar"],
] as const;

export default function AdminCommunicationsPage() {
  const router = useRouter();

  return (
    <AdminPageShell
      subtitle="Publish school notices and maintain the academic calendar."
      title="Communications"
    >
      <View className="mt-5">
        {communicationTools.map(([label, detail, route]) => (
          <Pressable
            className="mb-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
            key={route}
            onPress={() => router.push(route)}
          >
            <Text className="text-lg font-extrabold text-slate-900">{label}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">{detail}</Text>
          </Pressable>
        ))}
      </View>
    </AdminPageShell>
  );
}
