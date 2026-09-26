import { useEffect, useMemo, useState } from "react";
import { Link2, Search, Unlink, Users } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchStudentDirectory, type StudentDirectoryRecord } from "../../services/DirectoryService";
import {
  fetchParentDirectory,
  linkStudentToParent,
  unlinkStudentFromParent,
  type ParentDirectoryRecord,
} from "../../services/IdentityLinkService";
import { logActivity } from "../../utils/firestoreHelpers";

export default function IdentityLinksPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [parents, setParents] = useState<ParentDirectoryRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [studentData, parentData] = await Promise.all([fetchStudentDirectory(), fetchParentDirectory()]);
    setStudents(studentData);
    setParents(parentData);
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error(error);
      setMessage("Unable to load identity links.");
    });
  }, []);

  const parentsById = useMemo(() => new Map(parents.map((parent) => [parent.parentId, parent])), [parents]);
  const isSynced = (student: StudentDirectoryRecord, parent?: ParentDirectoryRecord) =>
    !!parent && parent.studentIds.includes(student.studentId || student.id);
  const unresolvedStudents = students.filter((student) => {
    const parent = student.parentId ? parentsById.get(student.parentId) : undefined;
    return !isSynced(student, parent);
  });
  const unresolvedParents = parents.filter((parent) => !students.some((student) => student.parentId === parent.parentId));
  const filteredStudents = students.filter((student) => {
    const term = query.trim().toLowerCase();
    return !term || student.displayName.toLowerCase().includes(term) || student.studentId.toLowerCase().includes(term);
  });

  const link = async () => {
    const student = students.find((item) => (item.studentId || item.id) === studentId);
    const parent = parents.find((item) => item.parentId === parentId);
    if (!student || !parent) return;
    setSaving(true);
    try {
      await linkStudentToParent(student, parent, student.parentId ? parentsById.get(student.parentId) : undefined);
      await logActivity(user?.uid || "", "link_student_parent", { studentId, parentId });
      await loadData();
      setStudentId("");
      setParentId("");
      setMessage("Student and parent profiles linked.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to link the selected profiles.");
    } finally {
      setSaving(false);
    }
  };

  const unlink = async (student: StudentDirectoryRecord) => {
    const parent = student.parentId ? parentsById.get(student.parentId) : undefined;
    if (!parent || !window.confirm(`Remove the parent link for ${student.displayName}?`)) return;
    setSaving(true);
    try {
      await unlinkStudentFromParent(student, parent);
      await logActivity(user?.uid || "", "unlink_student_parent", { studentId: student.studentId, parentId: parent.parentId });
      await loadData();
      setMessage("Parent link removed.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to remove the parent link.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Parent-Student Links</h1><p className="mt-1 text-sm text-slate-600">Resolve family access by maintaining both parent and student profiles together.</p></div>
      {message && <p className="border bg-white px-3 py-2 text-sm text-slate-700">{message}</p>}
      <section className="grid gap-3 border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="rounded-md border px-3 py-2"><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.studentId || student.id}>{student.displayName} | {student.studentId || student.id}</option>)}</select>
        <select value={parentId} onChange={(event) => setParentId(event.target.value)} className="rounded-md border px-3 py-2"><option value="">Select parent</option>{parents.map((parent) => <option key={parent.id} value={parent.parentId}>{parent.displayName} | {parent.parentId}</option>)}</select>
        <button disabled={!studentId || !parentId || saving} onClick={link} className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Link2 size={16} /> Link Profiles</button>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Summary title="Students Needing Review" value={unresolvedStudents.length} detail="No valid parent profile linked" />
        <Summary title="Parents Needing Review" value={unresolvedParents.length} detail="No students linked" />
      </section>
      <label className="relative block max-w-md"><Search className="absolute left-3 top-2.5 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student name or ID" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" /></label>
      <section className="overflow-x-auto border bg-white">
        <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Link Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{filteredStudents.map((student) => { const parent = student.parentId ? parentsById.get(student.parentId) : undefined; const synced = isSynced(student, parent); return <tr key={student.id}><td className="px-4 py-3"><p className="font-medium">{student.displayName}</p><p className="text-xs text-slate-500">{student.studentId || student.id}</p></td><td className="px-4 py-3">{parent ? <><p>{parent.displayName}</p><p className="text-xs text-slate-500">{parent.parentId}</p></> : <span className="text-slate-500">Unlinked</span>}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${synced ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{synced ? "linked" : parent ? "needs sync" : "needs review"}</span></td><td className="px-4 py-3 text-right">{parent && <button title="Remove parent link" disabled={saving} onClick={() => unlink(student)} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Unlink size={16} /></button>}</td></tr>; })}{!filteredStudents.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500"><Users className="mx-auto mb-2" size={20} />No students found.</td></tr>}</tbody></table>
      </section>
    </div>
  );
}

function Summary({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <div className="border bg-white p-4"><p className="text-xs uppercase text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}
