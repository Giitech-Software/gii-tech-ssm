import { useEffect, useState } from "react";
import type * as React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SharedPageShell as StaffPageShell } from "../../src/components/SharedPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../src/firebaseConfig";

type Item = { id: string; status: string; period?: string; netSalary?: number; ssnitEmployeeDeduction?: number; ssnitEmployerContribution?: number; balance?: number; amount?: number; type?: string };

export default function StaffFinancePage() {
  const { user } = useAuth(); const [payroll, setPayroll] = useState<Item[]>([]); const [loans, setLoans] = useState<Item[]>([]); const [welfare, setWelfare] = useState<Item[]>([]); const [error, setError] = useState("");
  useEffect(() => { if (!user?.uid) return; Promise.all([getDocs(query(collection(db, "staffPayroll"), where("staffId", "==", user.uid))), getDocs(query(collection(db, "staffLoans"), where("staffId", "==", user.uid))), getDocs(query(collection(db, "staffWelfare"), where("staffId", "==", user.uid)))]).then(([p, l, w]) => { setPayroll(p.docs.map((item) => ({ id: item.id, ...item.data() })) as Item[]); setLoans(l.docs.map((item) => ({ id: item.id, ...item.data() })) as Item[]); setWelfare(w.docs.map((item) => ({ id: item.id, ...item.data() })) as Item[]); }).catch(() => setError("Unable to load your financial records.")); }, [user?.uid]);
  return <StaffPageShell title="My financial records" subtitle="Review your payroll, SSNIT contributions, loan balances, and welfare history."><Text className="mt-4 text-sm text-red-600">{error}</Text><View className="mt-5"><Section title="Payslips" icon="cash-multiple" items={payroll} render={(item) => <><Text>{item.period || "Payroll period"}</Text><Text className="mt-1 text-sm text-slate-600">Net pay: GHS {(item.netSalary || 0).toFixed(2)}</Text><Text className="mt-1 text-xs text-slate-500">Employee SSNIT: GHS {(item.ssnitEmployeeDeduction || 0).toFixed(2)} · Employer: GHS {(item.ssnitEmployerContribution || 0).toFixed(2)}</Text></>} /><Section title="Loans" icon="bank-outline" items={loans} render={(item) => <>Balance: GHS {(item.balance || 0).toFixed(2)} · {item.status}</>} /><Section title="Welfare" icon="hand-heart-outline" items={welfare} render={(item) => <>GHS {(item.amount || 0).toFixed(2)} · {item.type || "record"}</>} /></View></StaffPageShell>;
}
function Section({ title, icon, items, render }: { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; items: Item[]; render: (item: Item) => React.ReactNode }) { return <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-5"><View className="flex-row items-center"><MaterialCommunityIcons color="#4338ca" name={icon} size={23} /><Text className="ml-3 text-lg font-extrabold text-slate-900">{title}</Text></View>{items.map((item) => <View key={item.id} className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><Text className="font-bold text-slate-900">{render(item)}</Text><Text className="mt-1 text-xs capitalize text-slate-500">Status: {item.status}</Text></View>)}{!items.length && <Text className="mt-4 text-sm text-slate-500">No records available.</Text>}</View>; }
