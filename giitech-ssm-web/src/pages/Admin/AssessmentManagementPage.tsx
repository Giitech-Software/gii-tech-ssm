import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { fetchClasses } from "../../services/ClassService";
import {
  createExamAssessment,
  createTerm,
  deleteExamAssessment,
  deleteTerm,
  fetchExamAssessments,
  fetchTerms,
  type AcademicTerm,
  type ExamAssessment,
} from "../../services/AssessmentService";

const currentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
};

interface ClassOption {
  id: string;
  classId?: string;
  name?: string;
}

const emptyTerm = {
  name: "Term 1",
  academicYear: currentAcademicYear(),
  startDate: "",
  endDate: "",
  status: "planned" as AcademicTerm["status"],
};

export default function AssessmentManagementPage() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [exams, setExams] = useState<ExamAssessment[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [termForm, setTermForm] = useState(emptyTerm);
  const [examForm, setExamForm] = useState({ name: "", classId: "", termId: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [termData, examData, classData] = await Promise.all([fetchTerms(), fetchExamAssessments(), fetchClasses()]);
    setTerms(termData);
    setExams(examData);
    setClasses(classData as ClassOption[]);
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error(error);
      setMessage("Unable to load assessment settings.");
    });
  }, []);

  const classNames = useMemo(
    () => new Map(classes.map((item) => [item.classId || item.id, item.name || item.classId || item.id])),
    [classes]
  );

  const saveTerm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createTerm(termForm);
      setTermForm(emptyTerm);
      await loadData();
      setMessage("Academic term created.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to create academic term.");
    } finally {
      setSaving(false);
    }
  };

  const saveExam = async (event: React.FormEvent) => {
    event.preventDefault();
    const term = terms.find((item) => item.id === examForm.termId);
    if (!term) return;
    setSaving(true);
    try {
      await createExamAssessment({ ...examForm, term: term.name, academicYear: term.academicYear });
      setExamForm({ name: "", classId: "", termId: "", startDate: "", endDate: "" });
      await loadData();
      setMessage("Exam assessment created.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to create exam assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assessment Setup</h1>
        <p className="mt-1 text-sm text-slate-600">Configure academic terms and class exam windows.</p>
      </div>
      {message && <p className="border bg-white px-3 py-2 text-sm text-slate-700">{message}</p>}

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <form onSubmit={saveTerm} className="space-y-3 border bg-white p-4">
          <h2 className="flex items-center gap-2 font-semibold"><CalendarRange size={18} /> New Academic Term</h2>
          <input required value={termForm.name} onChange={(event) => setTermForm({ ...termForm, name: event.target.value })} placeholder="Term name" className="w-full rounded-md border px-3 py-2" />
          <input required value={termForm.academicYear} onChange={(event) => setTermForm({ ...termForm, academicYear: event.target.value })} placeholder="Academic year" className="w-full rounded-md border px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input required type="date" value={termForm.startDate} onChange={(event) => setTermForm({ ...termForm, startDate: event.target.value })} className="rounded-md border px-3 py-2" />
            <input required type="date" value={termForm.endDate} onChange={(event) => setTermForm({ ...termForm, endDate: event.target.value })} className="rounded-md border px-3 py-2" />
          </div>
          <select value={termForm.status} onChange={(event) => setTermForm({ ...termForm, status: event.target.value as AcademicTerm["status"] })} className="w-full rounded-md border px-3 py-2">
            <option value="planned">Planned</option><option value="active">Active</option><option value="closed">Closed</option>
          </select>
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus size={16} /> Add Term</button>
        </form>
        <div className="overflow-x-auto border bg-white">
          <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Term</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{terms.map((term) => <tr key={term.id}><td className="px-4 py-3"><p className="font-medium">{term.name}</p><p className="text-xs text-slate-500">{term.academicYear}</p></td><td className="px-4 py-3">{term.startDate} to {term.endDate}</td><td className="px-4 py-3 capitalize">{term.status}</td><td className="px-4 py-3 text-right"><button title="Delete term" onClick={async () => { await deleteTerm(term.id); await loadData(); }} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <form onSubmit={saveExam} className="space-y-3 border bg-white p-4">
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck size={18} /> New Exam Window</h2>
          <input required value={examForm.name} onChange={(event) => setExamForm({ ...examForm, name: event.target.value })} placeholder="Exam name" className="w-full rounded-md border px-3 py-2" />
          <select required value={examForm.classId} onChange={(event) => setExamForm({ ...examForm, classId: event.target.value })} className="w-full rounded-md border px-3 py-2"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.classId || item.id}>{item.name || item.id}</option>)}</select>
          <select required value={examForm.termId} onChange={(event) => setExamForm({ ...examForm, termId: event.target.value })} className="w-full rounded-md border px-3 py-2"><option value="">Select term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name} | {term.academicYear}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input required type="date" value={examForm.startDate} onChange={(event) => setExamForm({ ...examForm, startDate: event.target.value })} className="rounded-md border px-3 py-2" /><input type="date" value={examForm.endDate} onChange={(event) => setExamForm({ ...examForm, endDate: event.target.value })} className="rounded-md border px-3 py-2" /></div>
          <button disabled={saving || !terms.length} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus size={16} /> Add Exam</button>
        </form>
        <div className="overflow-x-auto border bg-white">
          <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Term</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{exams.map((exam) => <tr key={exam.id}><td className="px-4 py-3"><p className="font-medium">{exam.name}</p><p className="text-xs text-slate-500">{exam.startDate}{exam.endDate ? ` to ${exam.endDate}` : ""}</p></td><td className="px-4 py-3">{classNames.get(exam.classId) || exam.classId}</td><td className="px-4 py-3">{exam.term}<p className="text-xs text-slate-500">{exam.academicYear}</p></td><td className="px-4 py-3 text-right"><button title="Delete exam" onClick={async () => { await deleteExamAssessment(exam.id); await loadData(); }} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}

