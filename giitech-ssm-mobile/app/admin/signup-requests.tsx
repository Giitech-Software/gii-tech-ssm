import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { decideSignupRequest, fetchSignupRequests, type SignupRequest } from "../../src/services/superAdminAccountService";

export default function SignupRequestsScreen() {
  const [items, setItems] = useState<SignupRequest[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const load = useCallback(async () => { setLoading(true); try { setItems(await fetchSignupRequests()); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load requests."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const decide = async (item: SignupRequest, decision: "approve" | "reject") => { setBusy(item.id); try { const result = await decideSignupRequest(item.id, decision); if (decision === "approve") Alert.alert("Approved", `Login ID: ${result.id || "created"}. Temporary password: ${result.temporaryPassword || "provided separately"}`); await load(); } catch (value) { setError(value instanceof Error ? value.message : "Unable to update request."); } finally { setBusy(""); } };
  const pending = items.filter((item) => item.status === "pending");
  return <AdminPageShell title="Signup requests" subtitle="Review and approve pending account requests."><StudentDataState error={error} loading={loading} offline={false} onRefresh={load} />{pending.map((item) => <View key={item.id} className="mt-3 rounded-3xl bg-white p-5"><Text className="text-base font-extrabold text-slate-900">{item.displayName}</Text><Text className="mt-1 text-sm capitalize text-slate-500">{item.role} · {item.phone || "No phone"}</Text>{item.role === "parent" && <Text className="mt-2 text-xs text-slate-500">Students: {(item.extra?.studentIds as string[] | undefined)?.join(", ") || "Not supplied"}</Text>}<View className="mt-4 flex-row"><Pressable disabled={!!busy} onPress={() => void decide(item, "reject")} className="mr-2 flex-1 items-center rounded-xl bg-red-50 px-3 py-3"><Text className="font-bold text-red-700">Reject</Text></Pressable><Pressable disabled={!!busy} onPress={() => void decide(item, "approve")} className="flex-1 items-center rounded-xl bg-emerald-600 px-3 py-3"><Text className="font-bold text-white">Approve</Text></Pressable></View></View>)}{!loading && !pending.length && <Text className="mt-5 rounded-2xl bg-white p-6 text-center text-slate-500">No pending requests.</Text>}</AdminPageShell>;
}
