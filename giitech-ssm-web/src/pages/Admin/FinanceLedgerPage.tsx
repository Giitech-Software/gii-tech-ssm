import { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Printer, ReceiptText, Search, Users, WalletCards } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "../../contexts/AuthContext";
import { fetchStudentDirectory, type StudentDirectoryRecord } from "../../services/DirectoryService";
import {
  buildLedgerSummaries,
  assignFeeStructureToStudents,
  createStudentCharge,
  fetchFeePayments,
  fetchStudentCharges,
  recordFeePayment,
  type FeePayment,
  type PaymentMethod,
  type StudentCharge,
} from "../../services/FinanceService";
import { fetchFees, type FeeStructure } from "../../services/FeeService";
import { logActivity } from "../../utils/firestoreHelpers";

const currency = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value || 0);
const currentAcademicYear = () => {
  const today = new Date();
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}/${start + 1}`;
};
const termOptions = ["Term 1", "Term 2", "Term 3"];

export default function FinanceLedgerPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [charges, setCharges] = useState<StudentCharge[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chargeForm, setChargeForm] = useState({ description: "", amount: "", academicYear: currentAcademicYear(), term: "Term 1", dueDate: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", academicYear: currentAcademicYear(), term: "Term 1", paymentMethod: "cash" as PaymentMethod, reference: "", notes: "" });
  const [bulkForm, setBulkForm] = useState({ feeId: "", academicYear: currentAcademicYear(), term: "Term 1", dueDate: "" });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentRecords, chargeRecords, paymentRecords, feeRecords] = await Promise.all([
        fetchStudentDirectory(),
        fetchStudentCharges(),
        fetchFeePayments(),
        fetchFees(),
      ]);
      setStudents(studentRecords.filter((student) => (student.status || "active") !== "archived"));
      setCharges(chargeRecords);
      setPayments(paymentRecords);
      setFeeStructures(feeRecords);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load finance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const summaries = useMemo(() => buildLedgerSummaries(charges, payments), [charges, payments]);
  const filteredSummaries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return summaries.filter((item) => !term || `${item.studentName} ${item.studentId}`.toLowerCase().includes(term));
  }, [search, summaries]);
  const selectedStudent = students.find((student) => student.studentId === selectedStudentId);
  const selectedSummary = summaries.find((item) => item.studentId === selectedStudentId);
  const selectedCharges = charges.filter((item) => item.studentId === selectedStudentId);
  const selectedPayments = payments.filter((item) => item.studentId === selectedStudentId);

  const addCharge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent || !chargeForm.description.trim() || Number(chargeForm.amount) <= 0) return;
    setSaving(true);
    try {
      const created = await createStudentCharge({
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.displayName,
        classId: selectedStudent.classId,
        description: chargeForm.description.trim(),
        amount: Number(chargeForm.amount),
        academicYear: chargeForm.academicYear,
        term: chargeForm.term,
        dueDate: chargeForm.dueDate,
        createdBy: user?.uid,
      });
      await logActivity(user?.uid || "", "create_student_charge", { chargeId: created.id, studentId: selectedStudent.studentId, amount: Number(chargeForm.amount) });
      setChargeForm({ ...chargeForm, description: "", amount: "", dueDate: "" });
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to create the student charge.");
    } finally {
      setSaving(false);
    }
  };

  const addPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent || Number(paymentForm.amount) <= 0) return;
    setSaving(true);
    try {
      const created = await recordFeePayment({
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.displayName,
        amount: Number(paymentForm.amount),
        academicYear: paymentForm.academicYear,
        term: paymentForm.term,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference.trim(),
        notes: paymentForm.notes.trim(),
        receivedBy: user?.uid,
      });
      await logActivity(user?.uid || "", "record_fee_payment", { paymentId: created.id, receiptNumber: created.receiptNumber, studentId: selectedStudent.studentId, amount: Number(paymentForm.amount) });
      setPaymentForm({ ...paymentForm, amount: "", reference: "", notes: "" });
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to record the payment.");
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = (payment: FeePayment) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Giitech Smart School Manager", 14, 18);
    doc.setFontSize(13); doc.text("Fee Payment Receipt", 14, 29);
    doc.setFontSize(10);
    const rows = [
      ["Receipt", payment.receiptNumber], ["Student", `${payment.studentName} (${payment.studentId})`],
      ["Academic Year", payment.academicYear], ["Term", payment.term], ["Payment Method", payment.paymentMethod],
      ["Reference", payment.reference || "-"], ["Amount Paid", currency(payment.amount)], ["Notes", payment.notes || "-"],
    ];
    rows.forEach(([label, value], index) => doc.text(`${label}: ${value}`, 14, 44 + index * 8));
    doc.text("Generated by Giitech-SSM", 14, 116);
    doc.save(`${payment.receiptNumber}.pdf`);
  };

  const assignBulkCharges = async (event: React.FormEvent) => {
    event.preventDefault();
    const fee = feeStructures.find((item) => item.feeId === bulkForm.feeId);
    if (!fee) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await assignFeeStructureToStudents(fee, students, bulkForm.academicYear, bulkForm.term, bulkForm.dueDate, user?.uid);
      await logActivity(user?.uid || "", "assign_bulk_fee_charges", { feeId: fee.feeId, created: result.created, skipped: result.skipped, term: bulkForm.term, academicYear: bulkForm.academicYear });
      setNotice(`${result.created} charge${result.created === 1 ? "" : "s"} created. ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped.`);
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to assign the fee structure.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900">Student Fee Ledger</h1><p className="mt-1 text-sm text-gray-600">Track student charges, payments, balances, and receipts.</p></div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={<WalletCards size={18} />} label="Total Charged" value={currency(summaries.reduce((sum, item) => sum + item.charged, 0))} />
        <Summary icon={<Banknote size={18} />} label="Total Collected" value={currency(summaries.reduce((sum, item) => sum + item.paid, 0))} />
        <Summary icon={<ReceiptText size={18} />} label="Outstanding" value={currency(summaries.reduce((sum, item) => sum + item.balance, 0))} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          <label className="relative block max-w-md"><Search className="absolute left-3 top-2.5 text-gray-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student name or ID" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" /></label>
          <div className="overflow-x-auto border bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Charged</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th></tr></thead><tbody className="divide-y">{!loading && filteredSummaries.map((item) => <tr key={item.studentId} onClick={() => setSelectedStudentId(item.studentId)} className={`cursor-pointer hover:bg-indigo-50 ${selectedStudentId === item.studentId ? "bg-indigo-50" : ""}`}><td className="px-4 py-3"><p className="font-medium">{item.studentName}</p><p className="text-xs text-gray-500">{item.studentId}</p></td><td className="px-4 py-3">{currency(item.charged)}</td><td className="px-4 py-3 text-green-700">{currency(item.paid)}</td><td className="px-4 py-3 font-medium text-red-700">{currency(item.balance)}</td></tr>)}{loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Loading ledgers...</td></tr>}{!loading && !filteredSummaries.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">No ledger records yet. Select a student to add the first charge.</td></tr>}</tbody></table></div>
          <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="w-full rounded-md border bg-white px-3 py-2 text-sm"><option value="">Select a student to open or create a ledger</option>{students.map((student) => <option key={student.id} value={student.studentId}>{student.displayName} ({student.studentId})</option>)}</select>
        </div>
        <div className="space-y-4">
          {selectedStudent ? <><div className="border bg-white p-4"><h2 className="font-semibold">{selectedStudent.displayName}</h2><p className="text-xs text-gray-500">{selectedStudent.studentId} | Balance: {currency(selectedSummary?.balance || 0)}</p></div><EntryForm title="Add Charge" onSubmit={addCharge} saving={saving}><input required placeholder="Description" value={chargeForm.description} onChange={(event) => setChargeForm({ ...chargeForm, description: event.target.value })} className="rounded-md border px-3 py-2" /><MoneyInput value={chargeForm.amount} onChange={(amount) => setChargeForm({ ...chargeForm, amount })} /><TermFields year={chargeForm.academicYear} term={chargeForm.term} onYear={(academicYear) => setChargeForm({ ...chargeForm, academicYear })} onTerm={(term) => setChargeForm({ ...chargeForm, term })} /><input type="date" value={chargeForm.dueDate} onChange={(event) => setChargeForm({ ...chargeForm, dueDate: event.target.value })} className="rounded-md border px-3 py-2" /></EntryForm><EntryForm title="Record Payment" onSubmit={addPayment} saving={saving}><MoneyInput value={paymentForm.amount} onChange={(amount) => setPaymentForm({ ...paymentForm, amount })} /><TermFields year={paymentForm.academicYear} term={paymentForm.term} onYear={(academicYear) => setPaymentForm({ ...paymentForm, academicYear })} onTerm={(term) => setPaymentForm({ ...paymentForm, term })} /><select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value as PaymentMethod })} className="rounded-md border px-3 py-2"><option value="cash">Cash</option><option value="mobile-money">Mobile money</option><option value="bank-transfer">Bank transfer</option><option value="card">Card</option><option value="cheque">Cheque</option></select><input placeholder="Reference (optional)" value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} className="rounded-md border px-3 py-2" /></EntryForm></> : <p className="border bg-white p-6 text-center text-sm text-gray-500">Select a student to manage their ledger.</p>}
        </div>
      </div>
      <form onSubmit={assignBulkCharges} className="grid gap-3 border bg-white p-4 md:grid-cols-[minmax(0,1fr)_160px_130px_160px_auto]">
        <div className="md:col-span-5"><h2 className="flex items-center gap-2 font-semibold"><Users size={17} /> Assign Fee Structure to Class</h2><p className="mt-1 text-xs text-gray-500">Creates charges for matching active students and skips existing charges for the same period.</p></div>
        <select required value={bulkForm.feeId} onChange={(event) => setBulkForm({ ...bulkForm, feeId: event.target.value })} className="rounded-md border px-3 py-2 text-sm"><option value="">Select fee structure</option>{feeStructures.map((item) => <option key={item.id} value={item.feeId}>{item.name} | {item.classId} | {currency(item.amount)}</option>)}</select>
        <input required value={bulkForm.academicYear} onChange={(event) => setBulkForm({ ...bulkForm, academicYear: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={bulkForm.term} onChange={(event) => setBulkForm({ ...bulkForm, term: event.target.value })} className="rounded-md border px-3 py-2 text-sm">{termOptions.map((item) => <option key={item}>{item}</option>)}</select>
        <input required type="date" value={bulkForm.dueDate} onChange={(event) => setBulkForm({ ...bulkForm, dueDate: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <button disabled={saving} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">Assign Charges</button>
      </form>
      {selectedStudent && <div className="grid gap-5 xl:grid-cols-2"><History title="Charges">{selectedCharges.map((item) => <HistoryRow key={item.id} title={item.description} meta={`${item.term} | ${item.academicYear}`} amount={currency(item.amount)} />)}</History><History title="Payments">{selectedPayments.map((item) => <HistoryRow key={item.id} title={item.receiptNumber} meta={`${item.paymentMethod} | ${item.term}`} amount={currency(item.amount)} action={<button title="Download receipt" onClick={() => printReceipt(item)} className="rounded-md p-2 text-indigo-600 hover:bg-indigo-50"><Printer size={16} /></button>} />)}</History></div>}
    </div>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border bg-white p-4"><div className="flex items-center gap-2 text-gray-500">{icon}<span className="text-xs uppercase">{label}</span></div><p className="mt-2 text-xl font-bold text-gray-900">{value}</p></div>; }
function EntryForm({ title, onSubmit, saving, children }: { title: string; onSubmit: (event: React.FormEvent) => void; saving: boolean; children: React.ReactNode }) { return <form onSubmit={onSubmit} className="grid gap-3 border bg-white p-4"><h3 className="font-semibold">{title}</h3>{children}<button disabled={saving} className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"><Plus size={15} />{saving ? "Saving..." : title}</button></form>; }
function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <input required min="0.01" step="0.01" type="number" placeholder="Amount" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border px-3 py-2" />; }
function TermFields({ year, term, onYear, onTerm }: { year: string; term: string; onYear: (value: string) => void; onTerm: (value: string) => void }) { return <div className="grid grid-cols-2 gap-3"><input required value={year} onChange={(event) => onYear(event.target.value)} className="rounded-md border px-3 py-2" /> <select value={term} onChange={(event) => onTerm(event.target.value)} className="rounded-md border px-3 py-2">{termOptions.map((item) => <option key={item}>{item}</option>)}</select></div>; }
function History({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border bg-white"><h2 className="border-b px-4 py-3 font-semibold">{title}</h2><div className="divide-y">{children || <p className="px-4 py-6 text-sm text-gray-500">No records yet.</p>}</div></section>; }
function HistoryRow({ title, meta, amount, action }: { title: string; meta: string; amount: string; action?: React.ReactNode }) { return <div className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-gray-500">{meta}</p></div><div className="flex items-center gap-2"><p className="text-sm font-semibold">{amount}</p>{action}</div></div>; }
