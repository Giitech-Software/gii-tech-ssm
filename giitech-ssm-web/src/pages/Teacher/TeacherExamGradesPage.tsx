import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Save } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchAssessmentStudents,
  fetchExamAssessments,
  fetchExamGradeEntries,
  saveExamGrades,
  type AssessmentStudent,
  type ExamAssessment,
} from "../../services/AssessmentService";
import { fetchClassSubjectSetup } from "../../services/SubjectSetupService";

export default function TeacherExamGradesPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamAssessment[]>([]);
  const [examId, setExamId] = useState("");
  const [subject, setSubject] = useState("");
  const [configuredSubjects, setConfiguredSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<AssessmentStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [classScores, setClassScores] = useState<Record<string, string>>({});
  const [examScores, setExamScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const selectedExam = useMemo(() => exams.find((item) => item.id === examId), [examId, exams]);

  useEffect(() => {
    fetchExamAssessments()
      .then(setExams)
      .catch((error) => {
        console.error(error);
        setMessage("Unable to load exam assessments.");
      });
  }, []);

  useEffect(() => {
    if (!selectedExam) {
      setStudents([]);
      return;
    }
    setLoading(true);
    fetchAssessmentStudents(selectedExam.classId)
      .then(setStudents)
      .catch((error) => {
        console.error(error);
        setMessage("Unable to load students for this exam.");
      })
      .finally(() => setLoading(false));
  }, [selectedExam]);

  useEffect(() => { if (!selectedExam) { setConfiguredSubjects([]); return; } void fetchClassSubjectSetup(selectedExam.classId).then(result => { setConfiguredSubjects(result.subjects); setSubject(result.subjects[0] || ""); }).catch(() => setConfiguredSubjects([])); }, [selectedExam]);

  const loadExistingMarks = async () => {
    if (!selectedExam || !subject.trim()) return;
    setLoading(true);
    try {
      const entries = await fetchExamGradeEntries(selectedExam.id, subject.trim());
      setMarks(Object.fromEntries(entries.map((entry) => [entry.studentId, String(entry.mark)])));
      setClassScores(Object.fromEntries(entries.map((entry) => [entry.studentId, entry.classScore == null ? "" : String(entry.classScore)])));
      setExamScores(Object.fromEntries(entries.map((entry) => [entry.studentId, entry.examScore == null ? "" : String(entry.examScore)])));
      setMessage(entries.length ? "Existing marks loaded." : "No marks recorded for this subject yet.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to load existing marks.");
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    if (!selectedExam || !user || !subject.trim()) return;
    const entries = students
      .filter((student) => marks[student.studentId] !== undefined && marks[student.studentId] !== "")
      .map((student) => ({
        studentId: student.studentId,
        studentName: student.displayName,
        mark: Number(marks[student.studentId]),
        classScore: classScores[student.studentId] === "" ? undefined : Number(classScores[student.studentId]),
        examScore: examScores[student.studentId] === "" ? undefined : Number(examScores[student.studentId]),
      }));
    if (!entries.length) {
      setMessage("Enter at least one mark before saving.");
      return;
    }
    setLoading(true);
    try {
      await saveExamGrades(selectedExam, subject, entries, user.uid);
      setMessage(`${entries.length} exam mark${entries.length === 1 ? "" : "s"} saved.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to save exam marks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Grade Entry</h1>
        <p className="mt-1 text-sm text-gray-600">Record subject marks for configured class examinations.</p>
      </div>
      {message && <p className="border bg-white px-3 py-2 text-sm text-gray-700">{message}</p>}
      <section className="grid gap-3 border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <select value={examId} onChange={(event) => { setExamId(event.target.value); setMarks({}); }} className="rounded-md border px-3 py-2">
          <option value="">Select exam assessment</option>
          {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} | {exam.term} | {exam.academicYear}</option>)}
        </select>
        {configuredSubjects.length ? <select value={subject} onChange={(event) => { setSubject(event.target.value); setMarks({}); }} className="rounded-md border px-3 py-2"><option value="">Select configured subject</option>{configuredSubjects.map(item => <option key={item} value={item}>{item}</option>)}</select> : <input value={subject} onChange={(event) => { setSubject(event.target.value); setMarks({}); }} placeholder="Subject (configure class subjects for a controlled list)" className="rounded-md border px-3 py-2" />}
        <button disabled={!selectedExam || !subject.trim() || loading} onClick={loadExistingMarks} className="rounded-md border px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-50">Load Marks</button>
      </section>
      <section className="overflow-x-auto border bg-white">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck size={18} /> Student Marks</h2>
          <button disabled={!selectedExam || !subject.trim() || loading || !students.length} onClick={saveMarks} className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Save size={16} /> Save Marks</button>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Student</th><th className="w-32 px-4 py-3">Class score</th><th className="w-32 px-4 py-3">Exam score</th><th className="w-32 px-4 py-3">Final score</th></tr></thead>
          <tbody className="divide-y">
            {students.map((student) => <tr key={student.studentId}><td className="px-4 py-3"><p className="font-medium">{student.displayName}</p><p className="text-xs text-gray-500">{student.studentId}</p></td><td className="px-4 py-3"><input type="number" min="0" max="100" value={classScores[student.studentId] || ""} onChange={(event) => setClassScores({ ...classScores, [student.studentId]: event.target.value })} className="w-full rounded-md border px-3 py-2" /></td><td className="px-4 py-3"><input type="number" min="0" max="100" value={examScores[student.studentId] || ""} onChange={(event) => setExamScores({ ...examScores, [student.studentId]: event.target.value })} className="w-full rounded-md border px-3 py-2" /></td><td className="px-4 py-3"><input type="number" min="0" max="100" value={marks[student.studentId] || ""} onChange={(event) => setMarks({ ...marks, [student.studentId]: event.target.value })} className="w-full rounded-md border px-3 py-2" /></td></tr>)}
            {!loading && !students.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Select an exam assessment to load its class list.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
