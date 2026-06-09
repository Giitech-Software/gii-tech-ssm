import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { classNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import { currency, fetchAdminFinance, financeDocumentId, type AdminFinanceData } from "../../src/services/adminFinanceService";

export default function AdminFeesPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [finance, setFinance] = useState<AdminFinanceData | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [directoryResult, financeResult] = await Promise.all([
        fetchAdminDirectory(user.uid),
        fetchAdminFinance(user.uid),
      ]);
      setDirectory(directoryResult.data);
      setFinance(financeResult);
      setOffline(directoryResult.source === "cache" || financeResult.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load fee structures.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const numericAmount = Number(amount);
    if (!name.trim() || numericAmount <= 0 || !classId) return setError("Enter a fee name, amount, and class.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const id = financeDocumentId("FEE");
      const result = await queueWrite({
        path: `fees/${id}`,
        type: "set",
        merge: false,
        serverTimestampFields: ["createdAt"],
        data: { feeId: id, name: name.trim(), amount: numericAmount, classId, streamId: streamId || null },
      });
      setName("");
      setAmount("");
      setClassId("");
      setStreamId("");
      setMessage(result === "synced" ? "Fee structure created." : "Fee structure saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create this fee structure.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, feeId: string) => {
    if (finance?.charges.some((charge) => charge.sourceFeeId === feeId)) return setError("This fee already has student charges and cannot be removed.");
    setSaving(true);
    setError("");
    try {
      const result = await queueWrite({ path: `fees/${id}`, type: "delete" });
      setMessage(result === "synced" ? "Fee structure removed." : "Removal saved offline and queued.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove this fee structure.");
    } finally {
      setSaving(false);
    }
  };

  const availableStreams = directory?.streams.filter((item) => !classId || item.classId === classId) || [];

  return (
    <AdminPageShell subtitle="Define class-based fees that can be assigned to student ledgers." title="Fee structures">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 rounded-3xl border border-indigo-100 bg-white p-5">
        <Text className="text-lg font-extrabold text-slate-900">Add fee structure</Text>
        <TextInput className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setName} placeholder="Fee name, e.g. Tuition" placeholderTextColor="#94a3b8" value={name} />
        <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="Amount in GHS" placeholderTextColor="#94a3b8" value={amount} />
        <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Class</Text>
        <View className="mt-2 flex-row flex-wrap">
          {directory?.classes.map((item) => {
            const value = item.classId || item.id;
            return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === value ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => { setClassId(value); setStreamId(""); }}><Text className={`text-sm font-bold ${classId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>;
          })}
        </View>
        <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Optional stream</Text>
        <View className="mt-2 flex-row flex-wrap">
          <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${!streamId ? "bg-indigo-700" : "bg-slate-100"}`} onPress={() => setStreamId("")}><Text className={`text-sm font-bold ${!streamId ? "text-white" : "text-slate-700"}`}>All streams</Text></Pressable>
          {availableStreams.map((item) => {
            const value = item.streamId || item.id;
            return <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${streamId === value ? "bg-indigo-700" : "bg-slate-100"}`} key={item.id} onPress={() => setStreamId(value)}><Text className={`text-sm font-bold ${streamId === value ? "text-white" : "text-slate-700"}`}>{item.name}</Text></Pressable>;
          })}
        </View>
        <Pressable className="mt-3 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving} onPress={create}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Add fee structure"}</Text></Pressable>
      </View>
      <View className="mt-5">
        {finance?.fees.map((fee) => (
          <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={fee.id}>
            <Text className="text-lg font-extrabold text-slate-900">{fee.name}</Text>
            <Text className="mt-1 text-xs text-slate-500">{fee.feeId}</Text>
            <Text className="mt-3 text-xl font-black text-indigo-800">{currency(fee.amount)}</Text>
            <Text className="mt-2 text-sm text-slate-600">{classNameFor(directory?.classes || [], fee.classId)}{fee.streamId ? ` | ${classNameFor(directory?.streams || [], fee.streamId)}` : " | All streams"}</Text>
            {fee.pending ? <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued</Text> : <Pressable className="mt-4 items-center rounded-2xl bg-red-50 px-4 py-3" disabled={saving} onPress={() => remove(fee.id, fee.feeId)}><Text className="text-sm font-bold text-red-700">Remove fee structure</Text></Pressable>}
          </View>
        ))}
      </View>
    </AdminPageShell>
  );
}
