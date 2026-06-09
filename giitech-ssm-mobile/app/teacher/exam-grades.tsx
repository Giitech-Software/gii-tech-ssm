import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  examGradeDocumentId,
  fetchTeacherExamAssessments,
  fetchTeacherExamRegister,
  type TeacherExamAssessment,
  type TeacherExamRegister,
} from "../../src/services/teacherService";

export default function TeacherExamGradesPage() {
  const { user } = useAuth();
  const { queueWrite } = useSync();
  const [exams, setExams] = useState<TeacherExamAssessment[]>([]);
  const [examId, setExamId] = useState("");
  const [subject, setSubject] = useState("");
  const [register, setRegister] = useState<TeacherExamRegister | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectedExam = useMemo(() => exams.find((exam) => exam.id === examId) || null, [examId, exams]);
  const pendingGradeIds = useMemo(() => new Set(register?.grades.filter((grade) => grade.pending).map((grade) => grade.id)), [register]);

  const loadExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchTeacherExamAssessments(user.uid);
      setExams(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load exam windows.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const loadMarks = useCallback(async () => {
    if (!user || !selectedExam || !subject.trim()) {
      setError("Select an exam and enter the subject before loading marks.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await fetchTeacherExamRegister(user.uid, selectedExam, subject);
      setRegister(result.data);
      setMarks(Object.fromEntries(result.data.grades.map((grade) => [grade.studentId, String(grade.mark)])));
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this exam register.");
    } finally {
      setLoading(false);
    }
  }, [selectedExam, subject, user]);

  const chooseExam = (id: string) => {
    setExamId(id);
    setRegister(null);
    setMarks({});
    setMessage("");
  };

  const saveMarks = async () => {
    if (!user || !selectedExam || !register) return;
    const cleanSubject = subject.trim();
    const entries = register.students
      .filter((student) => marks[student.studentId]?.trim())
      .map((student) => ({ ...student, mark: Number(marks[student.studentId]) }));
    if (!cleanSubject) return setError("Enter the subject before saving marks.");
    if (!entries.length) return setError("Enter at least one student mark before saving.");
    if (entries.some((entry) => !Number.isFinite(entry.mark) || entry.mark < 0 || entry.mark > 100)) {
      return setError("Every entered mark must be a number between 0 and 100.");
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let pending = false;
      for (const entry of entries) {
        const result = await queueWrite({
          path: `grades/${examGradeDocumentId(selectedExam.id, cleanSubject, entry.studentId)}`,
          type: "set",
          merge: true,
          serverTimestampFields: ["updatedAt"],
          data: {
            assessmentType: "exam",
            examId: selectedExam.id,
            examName: selectedExam.name,
            studentId: entry.studentId,
            studentName: entry.studentName,
            classId: selectedExam.classId,
            subject: cleanSubject,
            academicYear: selectedExam.academicYear,
            termId: selectedExam.termId,
            term: selectedExam.term,
            teacherId: user.uid,
            mark: entry.mark,
            score: entry.mark,
            total: 100,
          },
        });
        if (result === "pending") pending = true;
      }
      await loadMarks();
      setMessage(pending ? "Exam marks saved offline and queued for sync." : "Exam marks saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save exam marks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherPageShell subtitle="Record subject marks for configured class exam windows, online or offline." title="Exam grades">
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={register ? loadMarks : loadExams} />
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Select exam</Text>
      <View className="mt-2 flex-row flex-wrap">
        {exams.map((exam) => (
          <Pressable className={`mb-2 mr-2 rounded-full px-4 py-3 ${exam.id === examId ? "bg-emerald-700" : "bg-white"}`} key={exam.id} onPress={() => chooseExam(exam.id)}>
            <Text className={`text-sm font-bold ${exam.id === examId ? "text-white" : "text-slate-700"}`}>{exam.name}</Text>
          </Pressable>
        ))}
      </View>
      {!exams.length && !loading && <Text className="mt-3 text-sm text-slate-500">No exam windows have been configured yet.</Text>}
      {!!selectedExam && (
        <View className="mt-3 rounded-3xl bg-white p-5">
          <Text className="text-base font-extrabold text-slate-900">{selectedExam.name}</Text>
          <Text className="mt-1 text-xs font-bold uppercase text-slate-500">{selectedExam.term} | {selectedExam.academicYear}</Text>
          <Text className="mt-3 text-sm text-slate-600">Class: {selectedExam.classId}</Text>
          <Text className="mt-1 text-sm text-slate-600">{selectedExam.startDate}{selectedExam.endDate ? ` to ${selectedExam.endDate}` : ""}</Text>
        </View>
      )}
      <TextInput className="mt-4 rounded-2xl bg-white px-4 py-4 text-base" onChangeText={(value) => { setSubject(value); setRegister(null); setMarks({}); }} placeholder="Subject, for example Mathematics" placeholderTextColor="#94a3b8" value={subject} />
      <Pressable className="mt-3 items-center rounded-2xl bg-sky-700 px-4 py-4" disabled={loading} onPress={loadMarks}>
        <Text className="text-sm font-bold text-white">{loading ? "Loading..." : "Load class marks"}</Text>
      </Pressable>
      {!!register && (
        <>
          {!register.students.length && <Text className="mt-6 text-center text-sm text-slate-500">No students are assigned to this exam class.</Text>}
          <View className="mt-4">
            {register.students.map((student) => {
              const gradeId = examGradeDocumentId(selectedExam?.id || "", subject.trim(), student.studentId);
              return (
                <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={student.studentId}>
                  <Text className="text-base font-extrabold text-slate-900">{student.studentName}</Text>
                  <Text className="mt-1 text-xs font-semibold text-slate-500">{student.studentId}</Text>
                  {pendingGradeIds.has(gradeId) && <Text className="mt-2 text-xs font-bold uppercase text-amber-700">Queued for sync</Text>}
                  <TextInput className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-base" keyboardType="numeric" onChangeText={(value) => setMarks((current) => ({ ...current, [student.studentId]: value }))} placeholder="Mark out of 100" placeholderTextColor="#94a3b8" value={marks[student.studentId] || ""} />
                </View>
              );
            })}
          </View>
          {!!register.students.length && <Pressable className="items-center rounded-2xl bg-emerald-700 px-4 py-4 active:bg-emerald-800" disabled={saving} onPress={saveMarks}><Text className="text-sm font-bold text-white">{saving ? "Saving..." : "Save exam marks"}</Text></Pressable>}
        </>
      )}
    </TeacherPageShell>
  );
}
