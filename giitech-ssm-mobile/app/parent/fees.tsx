import { Text, View } from "react-native";
import { ParentPageShell } from "../../src/components/ParentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useParentData } from "../../src/hooks/useParentData";
import { parentOutstandingBalance } from "../../src/services/parentDetailService";

const currency = (value: number) => `GHS ${value.toFixed(2)}`;

export default function ParentFeesPage() {
  const { data, loading, error, load } = useParentData();
  const outstanding = parentOutstandingBalance(data?.ledgers || []);

  return (
    <ParentPageShell subtitle="Review ward balances and payment receipts." title="Fees and payments">
      <StudentDataState error={error} loading={loading} offline={data?.source === "cache"} onRefresh={load} />
      <View className="mt-5 rounded-3xl bg-indigo-700 p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-indigo-100">
          Outstanding balance
        </Text>
        <Text className="mt-2 text-3xl font-black text-white">{currency(outstanding)}</Text>
      </View>
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Ward balances</Text>
      {data?.ledgers.map((ledger) => (
        <View className="mt-3 rounded-3xl border border-slate-200 bg-white p-5" key={ledger.studentId}>
          <Text className="text-base font-extrabold text-slate-900">{ledger.studentName}</Text>
          <Text className="mt-1 text-xs text-slate-500">{ledger.studentId}</Text>
          <Text className="mt-3 text-sm text-slate-600">Paid: {currency(ledger.paid)}</Text>
          <Text className="mt-1 text-sm font-bold text-red-700">Balance: {currency(ledger.balance)}</Text>
        </View>
      ))}
      <Text className="mt-6 text-lg font-extrabold text-slate-900">Payment history</Text>
      {data?.payments.map((payment) => (
        <View className="mt-3 rounded-3xl border border-slate-200 bg-white p-5" key={payment.id}>
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
