import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { classNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import { attendanceSummary, fetchAdminOperations, type AdminOperationsData } from "../../src/services/adminOperationsService";

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [operations, setOperations] = useState<AdminOperationsData | null>(null);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [directoryResult, operationsResult] = await Promise.all([
        fetchAdminDirectory(user.uid),
        fetchAdminOperations(user.uid),
      ]);
      setDirectory(directoryResult.data);
      setOperations(operationsResult);
      setOffline(directoryResult.source === "cache" || operationsResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load attendance oversight.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const records = useMemo(() => (operations?.attendance || []).filter((record) => !classId || record.classId === classId), [classId, operations]);
  const summaries = useMemo(() => attendanceSummary(records), [records]);
  const present = records.filter((record) => record.status === "Present").length;
  const overallRate = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <AdminPageShell subtitle="Review attendance coverage and student participation across classes." title="Attendance oversight">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <View className="mt-5 rounded-3xl bg-indigo-950 p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-indigo-300">Recorded attendance</Text>
        <Text className="mt-2 text-4xl font-black text-white">{overallRate}%</Text>
        <Text className="mt-2 text-sm text-indigo-100">{present} present marks across {records.length} records</Text>
      </View>
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Filter class</Text>
      <View className="mt-2 flex-row flex-wrap">
        <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!classId ? "bg-indigo-700" : "bg-white"}`} onPress={() => setClassId("")}><Text className={`text-sm font-bold ${!classId ? "text-white" : "text-slate-700"}`}>All classes</Text></Pressable>
        {directory?.classes.map((item) => {
          const value = item.classId || item.id;
          return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === value ? "bg-indigo-700" : "bg-white"}`} key={item.id} onPress={() => setClassId(value)}><Text className={`text-sm font-bold ${classId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>;
        })}
      </View>
      {!loading && !summaries.length && !error && <Text className="mt-8 text-center text-sm text-slate-500">No attendance records found for this view.</Text>}
      <View className="mt-4">
        {summaries.map((item) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={item.studentId}>
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1"><Text className="text-base font-extrabold text-slate-900">{item.studentName}</Text><Text className="mt-1 text-xs text-slate-500">{item.studentId}</Text></View>
              <Text className="text-xl font-black text-indigo-800">{item.rate}%</Text>
            </View>
            <Text className="mt-3 text-sm text-slate-600">{item.present} present of {item.total} recorded days</Text>
            {!!classId && <Text className="mt-1 text-xs text-slate-500">{classNameFor(directory?.classes || [], classId)}</Text>}
          </View>
        ))}
      </View>
    </AdminPageShell>
  );
}
