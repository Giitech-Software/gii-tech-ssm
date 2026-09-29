import { Pressable, Text, TextInput, View } from "react-native";
import { ParentPageShell } from "../../src/components/ParentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useParentData } from "../../src/hooks/useParentData";
import { parentOutstandingBalance } from "../../src/services/parentDetailService";
import { initiateMobileMoneyPayment } from "../../src/services/mobileMoneyService";
import { useState } from "react";

const currency = (value: number) => `GHS ${value.toFixed(2)}`;

export default function ParentFeesPage() {
  const [studentId, setStudentId] = useState(""); const [amount, setAmount] = useState(""); const [phone, setPhone] = useState(""); const [provider, setProvider] = useState("mtn"); const [paying, setPaying] = useState(false); const [paymentMessage, setPaymentMessage] = useState("");
  const { data, loading, error, load } = useParentData();
  void setProvider;
  const outstanding = parentOutstandingBalance(data?.ledgers || []);

  return (
    <ParentPageShell subtitle="Review ward balances and payment receipts." title="Fees and payments">
      <StudentDataState error={error} loading={loading} offline={data?.source === "cache"} onRefresh={load} />
      <View className="mt-5 rounded-2xl border border-primary bg-primary p-5 shadow-sm">
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">
          Outstanding balance
        </Text>
        <Text className="mt-2 text-3xl font-black text-white">{currency(outstanding)}</Text>
      </View>
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Ward balances</Text>
      {data?.ledgers.map((ledger) => (
        <View className="mt-3 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm" key={ledger.studentId}>
          <Text className="text-base font-extrabold text-slate-900">{ledger.studentName}</Text>
          <Text className="mt-1 text-xs text-slate-500">{ledger.studentId}</Text>
          <Text className="mt-3 text-sm text-slate-600">Paid: {currency(ledger.paid)}</Text>
          <Text className="mt-1 text-sm font-bold text-red-700">Balance: {currency(ledger.balance)}</Text>
        </View>
      ))}
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Payment history</Text>
      <View className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"><Text className="text-base font-extrabold text-slate-900">Mobile Money payment</Text><TextInput value={studentId} onChangeText={setStudentId} placeholder="Ward student ID" placeholderTextColor="#94a3b8" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" /><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount in GHS" placeholderTextColor="#94a3b8" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" /><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Mobile Money phone" placeholderTextColor="#94a3b8" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" /><Pressable disabled={paying} onPress={async () => { setPaying(true); setPaymentMessage(""); try { const result = await initiateMobileMoneyPayment({ studentId, amount: Number(amount), phone, provider }); setPaymentMessage(`Payment intent ${result.intentId} created. Complete the prompt on your phone.`); } catch (e) { setPaymentMessage(e instanceof Error ? e.message : "Unable to start payment."); } finally { setPaying(false); } }} className="mt-4 rounded-xl bg-primary px-4 py-3"><Text className="text-center font-bold text-white">{paying ? "Starting..." : "Start Mobile Money payment"}</Text></Pressable>{paymentMessage && <Text className="mt-3 text-sm text-slate-600">{paymentMessage}</Text>}</View>
      {data?.payments.map((payment) => (
        <View className="mt-3 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm" key={payment.id}>
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-base font-extrabold text-slate-900">{payment.receiptNumber}</Text>
              <Text className="mt-1 text-sm text-slate-500">{payment.studentName} | {payment.term}</Text>
              <Text className="mt-1 text-xs capitalize text-slate-500">{payment.paymentMethod}</Text>
            </View>
            <Text className="text-base font-black text-emerald-700">{currency(payment.amount)}</Text>
          </View>
        </View>
      ))}
      {!loading && !data?.ledgers.length && !error && (
        <Text className="mt-8 text-center text-sm text-slate-500">No fee records found yet.</Text>
      )}
    </ParentPageShell>
  );
}
