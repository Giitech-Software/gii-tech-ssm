import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { fetchAdminDirectory, type AdminDirectoryData, type StudentDirectoryRecord } from "../../src/services/adminService";
import { buildLedgerSummaries, currency, currentAcademicYear, fetchAdminFinance, financeDocumentId, receiptNumber, type AdminFinanceData, type PaymentMethod } from "../../src/services/adminFinanceService";

const terms = ["Term 1", "Term 2", "Term 3"];
const methods: PaymentMethod[] = ["cash", "mobile-money", "bank-transfer", "card", "cheque"];

export default function AdminFinancePage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [finance, setFinance] = useState<AdminFinanceData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState("Term 1");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load the student ledger.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const students = useMemo(() => (directory?.students || []).filter((student) => student.status !== "archived"), [directory]);
  const summaries = useMemo(() => buildLedgerSummaries(finance?.charges || [], finance?.payments || []), [finance]);
  const selected = students.find((student) => student.studentId === selectedId);
  const selectedSummary = summaries.find((item) => item.studentId === selectedId);
  const selectedCharges = (finance?.charges || []).filter((item) => item.studentId === selectedId);
  const selectedPayments = (finance?.payments || []).filter((item) => item.studentId === selectedId);
  const filteredStudents = students.filter((student) => !search.trim() || `${student.displayName} ${student.studentId}`.toLowerCase().includes(search.trim().toLowerCase()));
  const totals = summaries.reduce((result, item) => ({ charged: result.charged + item.charged, paid: result.paid + item.paid, balance: result.balance + item.balance }), { charged: 0, paid: 0, balance: 0 });

  const addCharge = async () => {
    if (!selected || !description.trim() || Number(chargeAmount) <= 0) return setError("Select a student and enter the charge details.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const id = financeDocumentId("CHG");
      const result = await queueWrite({ path: `studentCharges/${id}`, type: "set", merge: false, serverTimestampFields: ["createdAt"], data: { studentId: selected.studentId, studentName: selected.displayName, classId: selected.classId, description: description.trim(), amount: Number(chargeAmount), academicYear, term, createdBy: user?.uid || "" } });
      setDescription("");
      setChargeAmount("");
      setMessage(result === "synced" ? "Student charge added." : "Student charge saved offline and queued.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add this charge.");
    } finally {
      setSaving(false);
    }
  };

  const addPayment = async () => {
    if (!selected || Number(paymentAmount) <= 0) return setError("Select a student and enter a payment amount.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const id = financeDocumentId("PAY");
      const receipt = receiptNumber();
      const result = await queueWrite({ path: `feePayments/${id}`, type: "set", merge: false, serverTimestampFields: ["createdAt"], data: { receiptNumber: receipt, studentId: selected.studentId, studentName: selected.displayName, amount: Number(paymentAmount), academicYear, term, paymentMethod: method, reference: reference.trim(), receivedBy: user?.uid || "" } });
      setPaymentAmount("");
      setReference("");
      setMessage(result === "synced" ? `Payment recorded. Receipt: ${receipt}` : `Payment queued offline. Receipt: ${receipt}`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record this payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell subtitle="Track student charges, payments, balances, and receipt references." title="Student fee ledger">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-5 flex-row flex-wrap justify-between">
        <SummaryCard label="Charged" value={currency(totals.charged)} />
        <SummaryCard label="Collected" value={currency(totals.paid)} />
        <SummaryCard label="Outstanding" value={currency(totals.balance)} />
      </View>
      <TextInput autoCapitalize="none" className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900" onChangeText={setSearch} placeholder="Search student name or ID" placeholderTextColor="#94a3b8" value={search} />
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Select student</Text>
      <View className="mt-2 flex-row flex-wrap">
        {filteredStudents.map((student) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${selectedId === student.studentId ? "bg-indigo-700" : "bg-white"}`} key={student.id} onPress={() => setSelectedId(student.studentId)}><Text className={`text-sm font-bold ${selectedId === student.studentId ? "text-white" : "text-slate-700"}`}>{student.displayName}</Text></Pressable>)}
      </View>
      {selected ? <LedgerWorkspace academicYear={academicYear} chargeAmount={chargeAmount} description={description} method={method} paymentAmount={paymentAmount} reference={reference} saving={saving} selected={selected} selectedCharges={selectedCharges} selectedPayments={selectedPayments} selectedSummary={selectedSummary} setAcademicYear={setAcademicYear} setChargeAmount={setChargeAmount} setDescription={setDescription} setMethod={setMethod} setPaymentAmount={setPaymentAmount} setReference={setReference} setTerm={setTerm} term={term} addCharge={addCharge} addPayment={addPayment} /> : <Text className="mt-6 rounded-3xl bg-white p-5 text-center text-sm text-slate-500">Select a student to open or create a ledger.</Text>}
    </AdminPageShell>
  );
}

function LedgerWorkspace({ academicYear, chargeAmount, description, method, paymentAmount, reference, saving, selected, selectedCharges, selectedPayments, selectedSummary, setAcademicYear, setChargeAmount, setDescription, setMethod, setPaymentAmount, setReference, setTerm, term, addCharge, addPayment }: { academicYear: string; chargeAmount: string; description: string; method: PaymentMethod; paymentAmount: string; reference: string; saving: boolean; selected: StudentDirectoryRecord; selectedCharges: AdminFinanceData["charges"]; selectedPayments: AdminFinanceData["payments"]; selectedSummary?: ReturnType<typeof buildLedgerSummaries>[number]; setAcademicYear: (value: string) => void; setChargeAmount: (value: string) => void; setDescription: (value: string) => void; setMethod: (value: PaymentMethod) => void; setPaymentAmount: (value: string) => void; setReference: (value: string) => void; setTerm: (value: string) => void; term: string; addCharge: () => void; addPayment: () => void }) {
  return <View className="mt-4"><View className="rounded-3xl bg-indigo-950 p-5"><Text className="text-lg font-extrabold text-white">{selected.displayName}</Text><Text className="mt-1 text-xs text-indigo-200">{selected.studentId}</Text><Text className="mt-3 text-sm font-bold text-white">Balance: {currency(selectedSummary?.balance || 0)}</Text></View><View className="mt-4 rounded-3xl bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">Period</Text><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setAcademicYear} placeholder="Academic year" placeholderTextColor="#94a3b8" value={academicYear} /><OptionRow options={terms} selected={term} setSelected={setTerm} /></View><View className="mt-4 rounded-3xl bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">Add charge</Text><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setDescription} placeholder="Charge description" placeholderTextColor="#94a3b8" value={description} /><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" keyboardType="decimal-pad" onChangeText={setChargeAmount} placeholder="Amount in GHS" placeholderTextColor="#94a3b8" value={chargeAmount} /><ActionButton label="Add student charge" onPress={addCharge} saving={saving} /></View><View className="mt-4 rounded-3xl bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">Record payment</Text><TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" keyboardType="decimal-pad" onChangeText={setPaymentAmount} placeholder="Amount in GHS" placeholderTextColor="#94a3b8" value={paymentAmount} /><OptionRow options={methods} selected={method} setSelected={(value) => setMethod(value as PaymentMethod)} /><TextInput className="mt-1 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900" onChangeText={setReference} placeholder="Reference (optional)" placeholderTextColor="#94a3b8" value={reference} /><ActionButton label="Record payment" onPress={addPayment} saving={saving} /></View><History title="Charges">{selectedCharges.map((item) => <HistoryItem amount={item.amount} key={item.id} label={item.description} meta={`${item.term} | ${item.academicYear}`} pending={item.pending} />)}</History><History title="Payments">{selectedPayments.map((item) => <HistoryItem amount={item.amount} key={item.id} label={item.receiptNumber} meta={`${item.paymentMethod} | ${item.term}`} pending={item.pending} />)}</History></View>;
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <View className="mb-2 w-[32%] rounded-2xl bg-white p-3"><Text className="text-[10px] font-bold uppercase text-slate-500">{label}</Text><Text className="mt-2 text-sm font-black text-slate-900">{value}</Text></View>; }
function OptionRow({ options, selected, setSelected }: { options: readonly string[]; selected: string; setSelected: (value: string) => void }) { return <View className="mt-3 flex-row flex-wrap">{options.map((item) => <Pressable className={`mb-2 mr-2 rounded-full px-3 py-3 ${selected === item ? "bg-indigo-700" : "bg-slate-100"}`} key={item} onPress={() => setSelected(item)}><Text className={`text-xs font-bold capitalize ${selected === item ? "text-white" : "text-slate-700"}`}>{item}</Text></Pressable>)}</View>; }
function ActionButton({ label, onPress, saving }: { label: string; onPress: () => void; saving: boolean }) { return <Pressable className="mt-3 items-center rounded-2xl bg-indigo-700 px-4 py-4" disabled={saving} onPress={onPress}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : label}</Text></Pressable>; }
function History({ title, children }: { title: string; children: React.ReactNode }) { return <View className="mt-4 rounded-3xl bg-white p-5"><Text className="text-lg font-extrabold text-slate-900">{title}</Text>{children}</View>; }
function HistoryItem({ amount, label, meta, pending }: { amount: number; label: string; meta: string; pending: boolean }) { return <View className="mt-3 border-t border-slate-100 pt-3"><View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text className="font-bold text-slate-800">{label}</Text><Text className="mt-1 text-xs text-slate-500">{meta}</Text></View><Text className="font-black text-indigo-800">{currency(amount)}</Text></View>{pending && <Text className="mt-2 text-xs font-bold uppercase text-amber-700">Queued</Text>}</View>; }
