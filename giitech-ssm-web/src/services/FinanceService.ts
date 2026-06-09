import { addDoc, collection, getDocs, query, serverTimestamp, Timestamp, where, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { FeeStructure } from "./FeeService";
import type { StudentDirectoryRecord } from "./DirectoryService";

export type PaymentMethod = "cash" | "mobile-money" | "bank-transfer" | "card" | "cheque";

export interface StudentCharge {
  id: string;
  studentId: string;
  studentName: string;
  description: string;
  amount: number;
  academicYear: string;
  term: string;
  dueDate?: string;
  classId?: string;
  sourceFeeId?: string;
  createdBy?: string;
  createdAt?: Timestamp | string;
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  academicYear: string;
  term: string;
  receivedBy?: string;
  createdAt?: Timestamp | string;
}

export interface StudentLedgerSummary {
  studentId: string;
  studentName: string;
  charged: number;
  paid: number;
  balance: number;
}

export type NewStudentCharge = Omit<StudentCharge, "id" | "createdAt">;
export type NewFeePayment = Omit<FeePayment, "id" | "receiptNumber" | "createdAt">;

export interface BulkChargeResult {
  created: number;
  skipped: number;
}

const toMillis = (value?: Timestamp | string) =>
  value instanceof Timestamp ? value.toMillis() : new Date(value || 0).getTime();

export async function fetchStudentCharges(): Promise<StudentCharge[]> {
  const snapshot = await getDocs(collection(db, "studentCharges"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as StudentCharge)
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

const chunkIds = (ids: string[]) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  return Array.from({ length: Math.ceil(uniqueIds.length / 10) }, (_, index) =>
    uniqueIds.slice(index * 10, index * 10 + 10)
  );
};

export async function fetchStudentChargesByStudentIds(studentIds: string[]): Promise<StudentCharge[]> {
  const chunks = chunkIds(studentIds);
  if (!chunks.length) return [];
  const snapshots = await Promise.all(
    chunks.map((ids) => getDocs(query(collection(db, "studentCharges"), where("studentId", "in", ids))))
  );
  return snapshots
    .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StudentCharge))
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

export async function fetchFeePayments(): Promise<FeePayment[]> {
  const snapshot = await getDocs(collection(db, "feePayments"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as FeePayment)
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

export async function fetchFeePaymentsByStudentIds(studentIds: string[]): Promise<FeePayment[]> {
  const chunks = chunkIds(studentIds);
  if (!chunks.length) return [];
  const snapshots = await Promise.all(
    chunks.map((ids) => getDocs(query(collection(db, "feePayments"), where("studentId", "in", ids))))
  );
  return snapshots
    .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as FeePayment))
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

export async function createStudentCharge(data: NewStudentCharge) {
  return addDoc(collection(db, "studentCharges"), { ...data, createdAt: serverTimestamp() });
}

export async function assignFeeStructureToStudents(
  fee: FeeStructure,
  students: StudentDirectoryRecord[],
  academicYear: string,
  term: string,
  dueDate: string,
  createdBy?: string
): Promise<BulkChargeResult> {
  const charges = await fetchStudentCharges();
  const matchingStudents = students.filter((student) => {
    const active = (student.status || "active") !== "archived";
    const sameClass = student.classId === fee.classId;
    const studentStream = student.streamId || student.stream;
    return active && sameClass && (!fee.streamId || studentStream === fee.streamId);
  });
  const duplicates = new Set(
    charges
      .filter((charge) => charge.academicYear === academicYear && charge.term === term)
      .map((charge) => `${charge.studentId}:${charge.sourceFeeId || ""}`)
  );
  const batch = writeBatch(db);
  let created = 0;
  let skipped = 0;

  matchingStudents.forEach((student) => {
    const key = `${student.studentId}:${fee.feeId}`;
    if (duplicates.has(key)) {
      skipped += 1;
      return;
    }
    batch.set(doc(collection(db, "studentCharges")), {
      studentId: student.studentId,
      studentName: student.displayName,
      classId: student.classId,
      sourceFeeId: fee.feeId,
      description: fee.name,
      amount: Number(fee.amount),
      academicYear,
      term,
      dueDate,
      createdBy: createdBy || "",
      createdAt: serverTimestamp(),
    });
    created += 1;
  });

  if (created) await batch.commit();
  return { created, skipped };
}

export async function recordFeePayment(data: NewFeePayment) {
  const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
  const created = await addDoc(collection(db, "feePayments"), {
    ...data,
    receiptNumber,
    createdAt: serverTimestamp(),
  });
  return { id: created.id, receiptNumber };
}

export function buildLedgerSummaries(charges: StudentCharge[], payments: FeePayment[]) {
  const ledgers = new Map<string, StudentLedgerSummary>();

  charges.forEach((charge) => {
    const item = ledgers.get(charge.studentId) || {
      studentId: charge.studentId,
      studentName: charge.studentName,
      charged: 0,
      paid: 0,
      balance: 0,
    };
    item.charged += Number(charge.amount) || 0;
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
    item.paid += Number(payment.amount) || 0;
    item.balance = item.charged - item.paid;
    ledgers.set(payment.studentId, item);
  });

  return [...ledgers.values()].sort((left, right) => left.studentName.localeCompare(right.studentName));
}
