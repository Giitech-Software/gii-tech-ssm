import { Text, View } from "react-native";
import { SharedPageShell } from "../../src/components/SharedPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useCommunicationData } from "../../src/hooks/useCommunicationData";
import { fetchCalendarEvents } from "../../src/services/communicationService";

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function CalendarPage() {
  const { result, loading, error, load } = useCommunicationData(
    fetchCalendarEvents,
    "Unable to load the academic calendar."
  );

  return (
    <SharedPageShell subtitle="Term dates, exams, activities, and other school events." title="Academic calendar">
      <StudentDataState error={error} loading={loading} offline={result?.source === "cache"} onRefresh={load} />
      {!loading && !result?.data.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No calendar events are available.</Text>
      )}
      <View className="mt-4">
        {result?.data.map((event) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={event.id}>
            <View className="flex-row items-center justify-between">
              <Text className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase text-violet-700">
                {event.eventType}
              </Text>
              <Text className="text-xs font-semibold uppercase text-slate-400">{event.audience}</Text>
            </View>
            <Text className="mt-4 text-lg font-extrabold text-slate-900">{event.title}</Text>
            <Text className="mt-2 text-sm font-bold text-violet-700">
              {formatDate(event.startDate)}
              {!!event.endDate && event.endDate !== event.startDate && ` - ${formatDate(event.endDate)}`}
            </Text>
            {!!event.location && <Text className="mt-2 text-sm text-slate-500">{event.location}</Text>}
            {!!event.description && (
              <Text className="mt-3 text-sm leading-6 text-slate-600">{event.description}</Text>
            )}
          </View>
        ))}
      </View>
    </SharedPageShell>
  );
}
