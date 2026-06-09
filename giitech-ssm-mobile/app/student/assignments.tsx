import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  fetchStudentAssignments,
  type StudentAssignment,
} from "../../src/services/studentDetailService";

function formatDueDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchStudentAssignments(user.uid);
      setAssignments(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StudentPageShell
      subtitle="Review coursework deadlines and the assignments you have already submitted."
      title="My assignments"
    >
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!loading && !assignments.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No assignments found yet.</Text>
      )}
      <View className="mt-4">
        {assignments.map((assignment) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={assignment.id}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-lg font-extrabold text-slate-900">{assignment.title}</Text>
                <Text className="mt-1 text-sm font-semibold text-sky-700">{assignment.subject}</Text>
              </View>
              <Text
                className={`rounded-full px-3 py-2 text-xs font-bold ${
                  assignment.status === "submitted"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {assignment.status}
              </Text>
            </View>
            {!!assignment.description && (
              <Text className="mt-3 text-sm leading-5 text-slate-600">{assignment.description}</Text>
            )}
            <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Due {formatDueDate(assignment.dueDate)} | {assignment.type}
            </Text>
            <Pressable
              className="mt-4 items-center rounded-2xl bg-sky-700 px-4 py-3 active:bg-sky-800"
              onPress={() =>
                router.push(`./submission?assignmentId=${assignment.id}`)
              }
            >
              <Text className="text-sm font-bold text-white">
                {assignment.status === "submitted" ? "Update response" : "Open assignment"}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </StudentPageShell>
  );
}
