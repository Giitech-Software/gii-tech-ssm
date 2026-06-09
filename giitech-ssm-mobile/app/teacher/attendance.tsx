import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  attendanceDocumentId,
  fetchTeacherClasses,
  fetchTeacherClassRegister,
  type TeacherAttendanceStatus,
  type TeacherClass,
  type TeacherClassRegister,
} from "../../src/services/teacherService";

const today = new Date().toISOString().slice(0, 10);

export default function TeacherAttendancePage() {
  const { user, displayName } = useAuth();
  const { queueWrite } = useSync();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classId, setClassId] = useState("");
  const [register, setRegister] = useState<TeacherClassRegister | null>(null);
  const [statuses, setStatuses] = useState<Record<string, TeacherAttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadClasses = useCallback(async () => {
    if (!user) return;
    try {
      const result = await fetchTeacherClasses(user.uid);
      setClasses(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load classes.");
    }
  }, [user]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const loadRegister = useCallback(async () => {
    if (!user || !classId) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchTeacherClassRegister(user.uid, classId);
      const todaysRecords = new Map(
        result.data.records.filter((record) => record.date === today).map((record) => [record.studentId, record.status])
      );
      setRegister(result.data);
      setStatuses(Object.fromEntries(result.data.students.map((student) => [student.studentId, todaysRecords.get(student.studentId) || "Pending"])));
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this class register.");
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  const markAll = (status: "Present" | "Absent") => {
    if (!register) return;
    setStatuses(Object.fromEntries(register.students.map((student) => [student.studentId, status])));
  };

  const submit = async () => {
    if (!user || !register || !classId) return;
    if (register.students.some((student) => statuses[student.studentId] === "Pending")) {
      setError("Mark every student as present or absent before submitting.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let pending = false;
      for (const student of register.students) {
        const status = statuses[student.studentId] as "Present" | "Absent";
        const result = await queueWrite({
          path: `attendance/${attendanceDocumentId(today, classId, student.studentId)}`,
          type: "set",
          merge: true,
          serverTimestampFields: ["createdAt"],
          data: {
            studentId: student.studentId,
            studentName: student.studentName,
            classId,
            date: today,
            present: status === "Present",
            status,
            teacherName: displayName || "Teacher",
          },
        });
        if (result === "pending") pending = true;
      }
      setMessage(pending ? "Attendance saved offline and queued for sync." : "Attendance register submitted.");
      if (!pending) await loadRegister();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherPageShell subtitle={`Record the daily class register for ${today}.`} title="Attendance">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={classId ? loadRegister : loadClasses} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Select class</Text>
      <View className="mt-2 flex-row flex-wrap">
        {classes.map((item) => (
          <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${classId === item.classId ? "bg-emerald-700" : "bg-white"}`} key={item.id} onPress={() => setClassId(item.classId)}>
            <Text className={`text-sm font-bold ${classId === item.classId ? "text-white" : "text-slate-700"}`}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
      {!!register && (
        <>
          <View className="mt-4 flex-row">
            <Pressable className="mr-2 flex-1 items-center rounded-2xl bg-emerald-100 px-3 py-3" onPress={() => markAll("Present")}><Text className="text-sm font-bold text-emerald-800">All present</Text></Pressable>
            <Pressable className="flex-1 items-center rounded-2xl bg-red-100 px-3 py-3" onPress={() => markAll("Absent")}><Text className="text-sm font-bold text-red-700">All absent</Text></Pressable>
          </View>
          {!register.students.length && <Text className="mt-6 text-center text-sm text-slate-500">No students are assigned to this class.</Text>}
          <View className="mt-4">
            {register.students.map((student) => (
              <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={student.studentId}>
                <Text className="text-base font-extrabold text-slate-900">{student.studentName}</Text>
                <Text className="mt-1 text-xs font-semibold text-slate-500">{student.studentId}</Text>
                <View className="mt-4 flex-row">
                  {(["Present", "Absent"] as const).map((status) => (
                    <Pressable className={`mr-2 rounded-full px-4 py-3 ${statuses[student.studentId] === status ? status === "Present" ? "bg-emerald-700" : "bg-red-700" : "bg-slate-100"}`} key={status} onPress={() => setStatuses((current) => ({ ...current, [student.studentId]: status }))}>
                      <Text className={`text-sm font-bold ${statuses[student.studentId] === status ? "text-white" : "text-slate-700"}`}>{status}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
          {!!register.students.length && <Pressable className="items-center rounded-2xl bg-emerald-700 px-4 py-4 active:bg-emerald-800" disabled={saving} onPress={submit}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Submit attendance"}</Text></Pressable>}
        </>
      )}
    </TeacherPageShell>
  );
}
