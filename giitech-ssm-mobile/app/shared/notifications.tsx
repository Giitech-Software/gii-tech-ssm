import { Text, View } from "react-native";
import { SharedPageShell } from "../../src/components/SharedPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useCommunicationData } from "../../src/hooks/useCommunicationData";
import {
  fetchNotifications,
  formatCommunicationDate,
} from "../../src/services/communicationService";

const categoryStyle = {
  alert: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
  announcement: "bg-violet-100 text-violet-700",
} as const;

export default function NotificationsPage() {
  const { result, loading, error, load } = useCommunicationData(
    fetchNotifications,
    "Unable to load notifications."
  );

  return (
    <SharedPageShell subtitle="Active workflow alerts and school updates for your account." title="Notifications">
      <StudentDataState error={error} loading={loading} offline={result?.source === "cache"} onRefresh={load} />
      {!loading && !result?.data.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No active notifications.</Text>
      )}
      <View className="mt-4">
        {result?.data.map((notification) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={notification.id}>
            <Text className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryStyle[notification.category]}`}>
              {notification.category}
            </Text>
            <Text className="mt-4 text-lg font-extrabold text-slate-900">{notification.title}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</Text>
            {!!notification.route && (
              <Text className="mt-3 text-xs font-bold uppercase text-violet-700">
                Workflow update
              </Text>
            )}
            <Text className="mt-4 text-xs text-slate-400">
              {formatCommunicationDate(notification.updatedAt || notification.createdAt)}
            </Text>
          </View>
        ))}
      </View>
    </SharedPageShell>
  );
}
