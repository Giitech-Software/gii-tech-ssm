import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AdminPageShell } from "../../src/components/AdminPageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { classNameFor, fetchAdminDirectory, type AdminDirectoryData } from "../../src/services/adminService";
import { activityLogDocumentId, studentIdentityPayload } from "../../src/services/adminSecurityService";

export default function AdminStudentQrPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [directory, setDirectory] = useState<AdminDirectoryData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminDirectory(user.uid);
      setDirectory(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load student identities.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (directory?.students || []).filter((student) =>
      student.status !== "archived" && (!term || `${student.displayName} ${student.studentId}`.toLowerCase().includes(term))
    );
  }, [directory, search]);
  const selected = directory?.students.find((student) => student.studentId === selectedId);

  const selectStudent = async (studentId: string) => {
    setSelectedId(studentId);
    setNotice("");
    if (!user) return;
    const result = await queueWrite({
      path: `activityLogs/${activityLogDocumentId()}`,
      type: "set",
      merge: false,
      serverTimestampFields: ["createdAt"],
      data: { userId: user.uid, action: "generate_student_qr", details: { studentId } },
    });
    if (result === "pending") setNotice("QR identity opened. Audit record queued for sync.");
  };

  return (
    <AdminPageShell subtitle="Generate scannable identity cards for student lookup and school access workflows." title="Student QR identity">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />
      {!!notice && <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{notice}</Text>}
      <Text className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-800">QR codes identify a student record for lookup. They are not authentication tokens and should not be used alone to grant sensitive access.</Text>
      <TextInput autoCapitalize="none" className="mt-5 rounded-2xl bg-white px-4 py-4 text-base text-slate-900" onChangeText={setSearch} placeholder="Search student name or ID" placeholderTextColor="#94a3b8" value={search} />
      <View className="mt-4 flex-row flex-wrap">
        {students.map((student) => <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${selectedId === student.studentId ? "bg-indigo-700" : "bg-white"}`} key={student.id} onPress={() => void selectStudent(student.studentId)}><Text className={`text-sm font-bold ${selectedId === student.studentId ? "text-white" : "text-slate-700"}`}>{student.displayName}</Text></Pressable>)}
      </View>
      {selected && <View className="mt-5 items-center rounded-3xl bg-white p-6"><Text className="text-xs font-bold uppercase tracking-widest text-indigo-600">Giitech Smart School Manager</Text><Text className="mt-3 text-2xl font-black text-slate-900">{selected.displayName}</Text><Text className="mt-1 text-sm font-bold text-slate-500">{selected.studentId}</Text><View className="mt-6 rounded-3xl border border-slate-100 bg-white p-4"><QRCode backgroundColor="#ffffff" color="#0f172a" size={220} value={studentIdentityPayload(selected.studentId)} /></View><Text className="mt-5 text-sm font-bold text-slate-700">{classNameFor(directory?.classes || [], selected.classId)}</Text><Text className="mt-2 text-xs text-slate-500">Scan for student record lookup</Text></View>}
    </AdminPageShell>
  );
}
