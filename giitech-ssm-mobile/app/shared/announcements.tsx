import { Text, View } from "react-native";
import { SharedPageShell } from "../../src/components/SharedPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useCommunicationData } from "../../src/hooks/useCommunicationData";
import {
  fetchAnnouncements,
  formatCommunicationDate,
} from "../../src/services/communicationService";

const categoryStyle = {
  alert: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
  announcement: "bg-violet-100 text-violet-700",
} as const;

export default function AnnouncementsPage() {
  const { result, loading, error, load } = useCommunicationData(
    fetchAnnouncements,
    "Unable to load announcements."
  );

  return (
    <SharedPageShell subtitle="School notices and important updates for your account." title="Announcements">
      <StudentDataState error={error} loading={loading} offline={result?.source === "cache"} onRefresh={load} />
      {!loading && !result?.data.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No announcements are available.</Text>
      )}
      <View className="mt-4">
        {result?.data.map((announcement) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={announcement.id}>
            <View className="flex-row flex-wrap items-center">
              <Text className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryStyle[announcement.category]}`}>
                {announcement.category}
              </Text>
              <Text className="ml-2 text-xs font-semibold uppercase text-slate-400">
                {announcement.audience}
              </Text>
            </View>
            <Text className="mt-4 text-lg font-extrabold text-slate-900">{announcement.title}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">{announcement.message}</Text>
            {!!announcement.createdAt && (
              <Text className="mt-4 text-xs text-slate-400">
                {formatCommunicationDate(announcement.createdAt)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </SharedPageShell>
  );
}
