import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type StaffPayroll = { id: string; staffId: string; staffName: string; period: string; grossSalary: number; deductions: number; ssnitEmployeeRate?: number; ssnitEmployerRate?: number; ssnitEmployeeDeduction?: number; ssnitEmployerContribution?: number; ssnitTotal?: number; deductionsTotal?: number; netSalary: number; status: "draft" | "approved" | "paid"; paidAt?: unknown };
export type StaffLoan = { id: string; staffId: string; staffName: string; principal: number; balance: number; installment: number; purpose: string; status: "pending" | "active" | "settled" | "declined" };
export type StaffWelfare = { id: string; staffId: string; staffName: string; type: "contribution" | "claim"; amount: number; period: string; status: "pending" | "approved" | "paid" | "rejected"; notes?: string };
export type StaffFinanceData = { payroll: StaffPayroll[]; loans: StaffLoan[]; welfare: StaffWelfare[] };

export async function fetchStaffFinance(): Promise<StaffFinanceData> {
  const [payroll, loans, welfare] = await Promise.all([
    getDocs(query(collection(db, "staffPayroll"), orderBy("period", "desc"))),
    getDocs(query(collection(db, "staffLoans"), orderBy("createdAt", "desc"))),
    getDocs(query(collection(db, "staffWelfare"), orderBy("createdAt", "desc"))),
  ]);
  return {
    payroll: payroll.docs.map((item) => ({ id: item.id, ...item.data() })) as StaffPayroll[],
    loans: loans.docs.map((item) => ({ id: item.id, ...item.data() })) as StaffLoan[],
    welfare: welfare.docs.map((item) => ({ id: item.id, ...item.data() })) as StaffWelfare[],
  };
}

export async function createStaffPayroll(input: Omit<StaffPayroll, "id" | "netSalary" | "status">) {
  const employeeRate = input.ssnitEmployeeRate ?? 5.5; const employerRate = input.ssnitEmployerRate ?? 13; const employeeDeduction = Number((input.grossSalary * employeeRate / 100).toFixed(2)); const employerContribution = Number((input.grossSalary * employerRate / 100).toFixed(2));
  await addDoc(collection(db, "staffPayroll"), { ...input, ssnitEmployeeRate: employeeRate, ssnitEmployerRate: employerRate, ssnitEmployeeDeduction: employeeDeduction, ssnitEmployerContribution: employerContribution, ssnitTotal: employeeDeduction + employerContribution, deductionsTotal: input.deductions + employeeDeduction, netSalary: input.grossSalary - input.deductions - employeeDeduction, status: "draft", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function createStaffLoan(input: Omit<StaffLoan, "id" | "balance" | "status">) {
  await addDoc(collection(db, "staffLoans"), { ...input, balance: input.principal, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function createStaffWelfare(input: Omit<StaffWelfare, "id" | "status">) {
  await addDoc(collection(db, "staffWelfare"), { ...input, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateStaffFinanceStatus(collectionName: "staffPayroll" | "staffLoans" | "staffWelfare", id: string, status: string, actorId: string) {
  await updateDoc(doc(db, collectionName, id), { status, approvedBy: actorId, approvedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function recordStaffLoanRepayment(loan: StaffLoan, amount: number, actorId: string) {
  if (amount <= 0 || amount > loan.balance) throw new Error("Repayment must be greater than zero and not exceed the balance.");
  const remaining = Math.max(0, loan.balance - amount);
  await addDoc(collection(db, "staffLoanRepayments"), { loanId: loan.id, staffId: loan.staffId, staffName: loan.staffName, amount, recordedBy: actorId, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "staffLoans", loan.id), { balance: remaining, status: remaining === 0 ? "settled" : "active", updatedAt: serverTimestamp() });
}
