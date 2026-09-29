import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchMyLibraryLoans, type LibraryLoan } from "../../src/services/libraryService";

export default function StudentLibraryPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { if (!user) return; setLoading(true); setError(""); try { setLoans(await fetchMyLibraryLoans(user.uid)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load library records."); } finally { setLoading(false); } }, [user]);
  useEffect(() => { void load(); }, [load]);
  const active = useMemo(() => loans.filter((loan) => loan.status !== "returned"), [loans]);
  return <StudentPageShell title="My library" subtitle="Track borrowed books, due dates, returns, and overdue records."><StudentDataState error={error} loading={loading} offline={false} onRefresh={load} /><View className="mt-5 flex-row gap-3"><View className="flex-1 rounded-2xl border border-primary bg-primary p-4"><MaterialCommunityIcons color="#4338ca" name="book-open-page-variant-outline" size={24} /><Text className="mt-2 text-2xl font-black text-primary">{active.length}</Text><Text className="text-xs font-semibold text-primary">Active loans</Text></View><View className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 p-4"><MaterialCommunityIcons color="#b45309" name="calendar-alert" size={24} /><Text className="mt-2 text-2xl font-black text-amber-950">{active.filter((l) => l.status === "overdue").length}</Text><Text className="text-xs font-semibold text-amber-800">Overdue</Text></View></View><View className="mt-5">{loans.map((loan) => <View key={loan.id} className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-5"><View className="flex-1"><Text className="text-base font-extrabold text-slate-900">{loan.bookTitle}</Text><Text className="mt-1 text-sm text-slate-500">Due {loan.dueDate}</Text></View><Text className={`rounded-full px-3 py-2 text-xs font-bold ${loan.status === "overdue" ? "bg-red-100 text-red-700" : loan.status === "returned" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>{loan.status}</Text></View>)}{!loading && !loans.length && !error && <Text className="mt-8 text-center text-sm text-slate-500">No library records found yet.</Text>}</View></StudentPageShell>;
}
