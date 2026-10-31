import { useEffect, useMemo, useState } from "react";
import { FileCheck2, Search, Send } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchAcademicOptions, fetchStudentDirectory, type AcademicOption, type StudentDirectoryRecord } from "../../services/DirectoryService";
import {
  fetchPublishedReports,
  publishStudentReport,
  type PublishedStudentReport,
} from "../../services/ReportPublicationService";
import { fetchReportApproval } from "../../services/ReportApprovalService";

const currentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
};

export default function ReportPublishingPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [classes, setClasses] = useState<AcademicOption[]>([]);
  const [reports, setReports] = useState<PublishedStudentReport[]>([]);
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("all");
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState("Term 1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [studentData, reportData, academic] = await Promise.all([fetchStudentDirectory(), fetchPublishedReports(), fetchAcademicOptions()]);
    setStudents(studentData.filter((student) => (student.status || "active") !== "archived"));
    setClasses(academic.classes);
    setReports(reportData);
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error(error);
      setMessage("Unable to load report publishing data.");
    });
  }, []);

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.studentId || student.id, student])),
    [students]
  );
  const filteredStudents = useMemo(() => students.filter((student) => {
    const text = `${student.displayName} ${student.studentId || student.id}`.toLowerCase();
    return (classId === "all" || student.classId === classId) && text.includes(search.trim().toLowerCase());
  }), [students, classId, search]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await publishStudentReport(studentId, academicYear.trim(), term, user.uid);
      await loadData();
      setMessage("Report snapshot published to the parent portal.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to publish report.");
    } finally {
      setSaving(false);
    }
  };
  const publishAllApproved = async () => { if (!user) return; setSaving(true); setMessage(""); let published = 0; let skipped = 0; try { for (const student of students) { const id = student.studentId || student.id; const approval = await fetchReportApproval(id, academicYear.trim(), term); if (approval.status !== "approved") { skipped += 1; continue; } try { await publishStudentReport(id, academicYear.trim(), term, user.uid); published += 1; } catch { skipped += 1; } } await loadData(); setMessage(`Bulk publishing complete: ${published} published, ${skipped} skipped or incomplete.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Bulk publishing failed."); } finally { setSaving(false); } };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report Publishing</h1>
        <p className="mt-1 text-sm text-slate-600">Release reviewed term snapshots to linked parent accounts.</p>
      </div>
      {message && <p className="border bg-white px-3 py-2 text-sm text-slate-700">{message}</p>}
      <form onSubmit={publish} className="space-y-4 border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setStudentId(""); }} className="mt-1 w-full rounded-md border px-3 py-2"><option value="all">All classes</option>{classes.map((item) => <option key={item.classId || item.id} value={item.classId || item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Search learner<div className="relative mt-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or student ID" className="w-full rounded-md border py-2 pl-9 pr-3 font-normal" /></div></label></div>
        <div className="max-h-64 overflow-y-auto rounded-md border"><div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">{filteredStudents.map((student) => { const id = student.studentId || student.id; return <button type="button" key={student.id} onClick={() => setStudentId(id)} className={`rounded-md border px-3 py-2 text-left text-sm ${studentId === id ? "border-primary bg-primary/10" : "border-slate-200 hover:bg-slate-50"}`}><span className="block font-semibold">{student.displayName}</span><span className="text-xs text-slate-500">{id} · {student.classId || "No class"}</span></button>; })}{!filteredStudents.length && <p className="p-4 text-sm text-slate-500">No learners match this selection.</p>}</div></div>
        <p className="text-sm text-slate-500">{filteredStudents.length} learner{filteredStudents.length === 1 ? "" : "s"} available{studentId ? " · 1 selected" : ""}</p>
        <div className="grid gap-3 md:grid-cols-[1fr_170px_auto]">
        <input required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="Academic year" className="rounded-md border px-3 py-2" />
        <select value={term} onChange={(event) => setTerm(event.target.value)} className="rounded-md border px-3 py-2"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Send size={16} /> {saving ? "Publishing..." : "Publish"}</button>
        </div>
      </form>
      <div className="flex justify-end"><button disabled={saving || !students.length} onClick={() => void publishAllApproved()} className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">{saving ? "Publishing approved reports..." : "Publish all approved reports"}</button></div>
      <section className="overflow-x-auto border bg-white">
        <div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><FileCheck2 size={18} /> Released Reports</h2></div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Average</th><th className="px-4 py-3">Subjects</th></tr></thead>
          <tbody className="divide-y">
            {reports.map((report) => <tr key={report.id}><td className="px-4 py-3"><p className="font-medium">{report.studentName}</p><p className="text-xs text-slate-500">{studentsById.get(report.studentId)?.displayName ? report.studentId : report.studentId}</p></td><td className="px-4 py-3">{report.term}<p className="text-xs text-slate-500">{report.academicYear}</p></td><td className="px-4 py-3">{report.averageGrade.toFixed(2)}%</td><td className="px-4 py-3">{report.subjects.length}</td></tr>)}
            {!reports.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No report snapshots have been published yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
