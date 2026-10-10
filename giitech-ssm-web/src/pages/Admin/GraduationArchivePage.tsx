import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchAcademicOptions, fetchStudentDirectory, graduateStudentClass, type AcademicOption, type StudentDirectoryRecord } from "../../services/DirectoryService";

export default function GraduationArchivePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [classes, setClasses] = useState<AcademicOption[]>([]);
  const [classId, setClassId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [studentRecords, options] = await Promise.all([fetchStudentDirectory(), fetchAcademicOptions()]);
      setStudents(studentRecords);
      setClasses(options.classes);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load graduation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedClass = classes.find((item) => (item.classId || item.id) === classId);
  const activeStudents = useMemo(() => students.filter((student) => student.classId === classId && student.status !== "archived"), [classId, students]);

  const graduate = async () => {
    if (!classId || !year.trim() || !user?.uid) return setError("Select a class and enter the graduation year.");
    if (!activeStudents.length) return setError("No active learners were found in this class.");
    if (!window.confirm(`Graduate all ${activeStudents.length} learners in ${selectedClass?.name || classId} and move them to Graduated / Archive?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const count = await graduateStudentClass(classId, year.trim(), user.uid);
      setMessage(`${count} learner${count === 1 ? "" : "s"} moved to Graduated / Archive.`);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to archive this graduating class.");
    } finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-4xl space-y-6"><header><p className="eyebrow">Records management</p><h1 className="mt-1 text-3xl font-black tracking-tight text-dark">Graduation archive</h1><p className="mt-2 text-sm text-slate-500">Move a completed class out of active students while retaining records for future reports, verification, and accessibility.</p></header>{message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}<section className="surface space-y-5 p-6"><label className="block text-sm font-semibold text-slate-700">Graduation year<input value={year} onChange={(event) => setYear(event.target.value)} className="input mt-1" placeholder="e.g. 2026" /></label><label className="block text-sm font-semibold text-slate-700">Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className="input mt-1"><option value="">Select graduating class</option>{classes.map((item) => <option key={item.id} value={item.classId || item.id}>{item.name}</option>)}</select></label>{classId && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-primary">{selectedClass?.name || classId}</p><p className="mt-1 text-sm text-slate-600">{activeStudents.length} active learner{activeStudents.length === 1 ? "" : "s"} will be moved to the archive.</p></div>}<button disabled={loading || saving || !activeStudents.length} onClick={() => void graduate()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50"><ArchiveRestore size={18} />{saving ? "Archiving class..." : "Graduate and archive class"}</button></section></main>;
}
