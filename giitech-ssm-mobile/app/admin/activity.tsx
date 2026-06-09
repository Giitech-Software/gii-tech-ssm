import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { activityDetails, fetchAdminSecurity, formatActivityDate, type AdminSecurityData } from "../../src/services/adminSecurityService";

export default function AdminActivityPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminSecurityData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminSecurity(user.uid);
      setData(result);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const logs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.logs || []).filter((log) =>
      !term || `${log.action} ${log.userId} ${activityDetails(log.details)}`.toLowerCase().includes(term)
    );
  }, [data, search]);

  return (
    <AdminPageShell subtitle="Review recent administrative actions and pending offline audit records." title="Activity logs">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      <TextInput autoCapitalize="none" className="mt-5 rounded-2xl bg-white px-4 py-4 text-base text-slate-900" onChangeText={setSearch} placeholder="Search action, user, or details" placeholderTextColor="#94a3b8" value={search} />
      {!loading && !logs.length && !error && <Text className="mt-8 text-center text-sm text-slate-500">No activity records match this search.</Text>}
      <View className="mt-4">
        {logs.slice(0, 200).map((log) => (
          <View className="mb-3 rounded-3xl bg-white p-5" key={log.id}>
            <Text className="text-base font-extrabold capitalize text-slate-900">{log.action.replaceAll("_", " ")}</Text>
            <Text className="mt-1 text-xs text-slate-500">{log.userId || "Unknown user"} | {formatActivityDate(log.createdAt)}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-600">{activityDetails(log.details)}</Text>
            {log.pending && <Text className="mt-2 text-xs font-bold uppercase text-amber-700">Queued audit record</Text>}
          </View>
        ))}
      </View>
    </AdminPageShell>
  );
}
