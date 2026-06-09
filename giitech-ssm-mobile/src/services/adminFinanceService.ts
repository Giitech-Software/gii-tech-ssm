import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-finance";

export type PaymentMethod = "cash" | "mobile-money" | "bank-transfer" | "card" | "cheque";

export type FeeStructure = {
  id: string;
  feeId: string;
  name: string;
  amount: number;
  classId: string;
  streamId: string;
  pending: boolean;
};

export type StudentCharge = {
  id: string;
  studentId: string;
  studentName: string;
  description: string;
  amount: number;
  academicYear: string;
  term: string;
  dueDate: string;
  classId: string;
  sourceFeeId: string;
  pending: boolean;
};

export type FeePayment = {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  amount: number;
  academicYear: string;
  term: string;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
  pending: boolean;
};

export type LedgerSummary = {
  studentId: string;
  studentName: string;
  charged: number;
  paid: number;
  balance: number;
};

export type AdminFinanceData = {
  fees: FeeStructure[];
  charges: StudentCharge[];
  payments: FeePayment[];
  loadedAt: string;
  source: "live" | "cache";
};

type RawData = Record<string, unknown>;
type FinanceRecord = FeeStructure | StudentCharge | FeePayment;

function asPaymentMethod(value: unknown): PaymentMethod {
  return value === "mobile-money" ||
    value === "bank-transfer" ||
    value === "card" ||
    value === "cheque"
    ? value
    : "cash";
}

function feeFromData(id: string, data: RawData, pending = false): FeeStructure {
  return {
    id,
    feeId: String(data.feeId || id),
    name: String(data.name || "School fee"),
    amount: Number(data.amount) || 0,
    classId: String(data.classId || ""),
    streamId: String(data.streamId || ""),
    pending,
  };
}

function chargeFromData(id: string, data: RawData, pending = false): StudentCharge {
  return {
    id,
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    description: String(data.description || "Student charge"),
    amount: Number(data.amount) || 0,
    academicYear: String(data.academicYear || ""),
    term: String(data.term || ""),
    dueDate: String(data.dueDate || ""),
    classId: String(data.classId || ""),
    sourceFeeId: String(data.sourceFeeId || ""),
    pending,
  };
}

function paymentFromData(id: string, data: RawData, pending = false): FeePayment {
  return {
    id,
    receiptNumber: String(data.receiptNumber || id),
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    amount: Number(data.amount) || 0,
    academicYear: String(data.academicYear || ""),
    term: String(data.term || ""),
    paymentMethod: asPaymentMethod(data.paymentMethod),
    reference: String(data.reference || ""),
    notes: String(data.notes || ""),
    pending,
  };
}

function mergeQueuedRecords<T extends FinanceRecord>(
  records: Map<string, T>,
  collectionName: "fees" | "studentCharges" | "feePayments",
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string,
  fromData: (id: string, data: RawData, pending?: boolean) => T
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith(`${collectionName}/`))
    .forEach((write) => {
      const id = write.path.slice(collectionName.length + 1);
      if (write.type === "delete") {
        records.delete(id);
        return;
      }
      records.set(id, fromData(id, { ...(records.get(id) || {}), ...(write.data || {}) }, true));
    });
}

function mergeFinanceQueue(data: AdminFinanceData, writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  const fees = new Map(data.fees.map((item) => [item.id, item]));
  const charges = new Map(data.charges.map((item) => [item.id, item]));
  const payments = new Map(data.payments.map((item) => [item.id, item]));
  mergeQueuedRecords(fees, "fees", writes, userId, feeFromData);
  mergeQueuedRecords(charges, "studentCharges", writes, userId, chargeFromData);
  mergeQueuedRecords(payments, "feePayments", writes, userId, paymentFromData);
  return {
    ...data,
    fees: [...fees.values()].sort((left, right) => left.name.localeCompare(right.name)),
    charges: [...charges.values()].reverse(),
    payments: [...payments.values()].reverse(),
  };
}

export async function fetchAdminFinance(userId: string): Promise<AdminFinanceData> {
  const cached = await readCachedData<AdminFinanceData | null>(CACHE_SCOPE, userId, null);
  const queue = await getQueuedWrites();
  try {
    const [feeSnapshot, chargeSnapshot, paymentSnapshot] = await Promise.all([
      getDocs(collection(db, "fees")),
      getDocs(collection(db, "studentCharges")),
      getDocs(collection(db, "feePayments")),
    ]);
    const result = mergeFinanceQueue(
      {
        fees: feeSnapshot.docs.map((item) => feeFromData(item.id, item.data())),
        charges: chargeSnapshot.docs.map((item) => chargeFromData(item.id, item.data())),
        payments: paymentSnapshot.docs.map((item) => paymentFromData(item.id, item.data())),
        loadedAt: new Date().toISOString(),
        source: "live",
      },
      queue,
      userId
    );
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...mergeFinanceQueue(cached, queue, userId), source: "cache" };
  }
}

export function buildLedgerSummaries(charges: StudentCharge[], payments: FeePayment[]) {
  const ledgers = new Map<string, LedgerSummary>();
  charges.forEach((charge) => {
    const item = ledgers.get(charge.studentId) || {
      studentId: charge.studentId,
      studentName: charge.studentName,
      charged: 0,
      paid: 0,
      balance: 0,
    };
    item.charged += charge.amount;
    item.balance = item.charged - item.paid;
    ledgers.set(charge.studentId, item);
  });
  payments.forEach((payment) => {
    const item = ledgers.get(payment.studentId) || {
      studentId: payment.studentId,
      studentName: payment.studentName,
      charged: 0,
      paid: 0,
      balance: 0,
    };
    item.paid += payment.amount;
    item.balance = item.charged - item.paid;
    ledgers.set(payment.studentId, item);
  });
  return [...ledgers.values()].sort((left, right) => left.studentName.localeCompare(right.studentName));
}

export function financeDocumentId(prefix: "FEE" | "CHG" | "PAY") {
  return `${prefix}-M-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function receiptNumber() {
  return `RCP-M-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function currentAcademicYear() {
  const today = new Date();
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}/${start + 1}`;
}

export function currency(value: number) {
  return `GHS ${(Number(value) || 0).toFixed(2)}`;
}
