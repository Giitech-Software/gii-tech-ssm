import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Search, UserPlus, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchAcademicOptions,
  fetchStudentDirectory,
  updateStudentProfile,
  type AcademicOption,
  type StudentDirectoryRecord,
} from "../../services/DirectoryService";
import { useAuth } from "../../contexts/AuthContext";
import { logActivity } from "../../utils/firestoreHelpers";

const emptyOptions = { departments: [], classes: [], streams: [] } as {
  departments: AcademicOption[];
  classes: AcademicOption[];
  streams: AcademicOption[];
};

const statusOf = (student: StudentDirectoryRecord) => student.status || "active";

export default function StudentsDirectoryPage() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [options, setOptions] = useState(emptyOptions);
  const [editing, setEditing] = useState<StudentDirectoryRecord | null>(null);
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentRecords, academicOptions] = await Promise.all([
        fetchStudentDirectory(),
        fetchAcademicOptions(),
      ]);
      setStudents(studentRecords);
      setOptions(academicOptions);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load the student directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesTerm =
        !term ||
        student.displayName?.toLowerCase().includes(term) ||
        student.studentId?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term);
      return matchesTerm && (!classId || student.classId === classId) && (!status || statusOf(student) === status);
    });
  }, [classId, query, status, students]);

  const saveStudent = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateStudentProfile(editing.id, editing);
      await logActivity(user?.uid || "", "update_student_profile", { studentId: editing.studentId || editing.id });
      setEditing(null);
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the student profile.");
    } finally {
      setSaving(false);
    }
  };

  const archiveStudent = async (student: StudentDirectoryRecord) => {
    if (!window.confirm(`Archive ${student.displayName}'s student record?`)) return;
    await updateStudentProfile(student.id, { status: "archived" });
    await logActivity(user?.uid || "", "archive_student_profile", { studentId: student.studentId || student.id });
    await loadData();
  };

  const className = (student: StudentDirectoryRecord) =>
    options.classes.find((item) => (item.classId || item.id) === student.classId)?.name || student.classId || "-";
  const streamName = (student: StudentDirectoryRecord) =>
    options.streams.find((item) => (item.streamId || item.id) === (student.streamId || student.stream))?.name ||
    student.streamId ||
    student.stream ||
    "-";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Academic operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-dark">Student directory</h1>
          <p className="mt-1 text-sm text-slate-500">Maintain enrollment profiles and academic placement.</p>
        </div>
        {role === "superadmin" && (
          <Link to="/superadmin/create-user" className="btn-primary">
            <UserPlus size={17} /> Add Student
          </Link>
        )}
      </div>

      <div className="surface grid gap-3 p-4 sm:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, or email" className="input pl-9" />
        </label>
        <select value={classId} onChange={(event) => setClassId(event.target.value)} className="input">
          <option value="">All classes</option>
          {options.classes.map((item) => <option key={item.id} value={item.classId || item.id}>{item.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="table-container">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Placement</th><th className="px-4 py-3">Parent ID</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {!loading && filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-medium text-slate-900">{student.displayName}</p><p className="text-xs text-slate-500">{student.studentId || student.id} | {student.email || "No email"}</p></td>
                <td className="px-4 py-3"><p>{className(student)}</p><p className="text-xs text-slate-500">{streamName(student)}</p></td>
                <td className="px-4 py-3 text-slate-600">{student.parentId || "-"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusOf(student) === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{statusOf(student)}</span></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button title="Edit student" onClick={() => setEditing(student)} className="rounded-md p-2 text-primary hover:bg-primary"><Pencil size={16} /></button>{statusOf(student) !== "archived" && <button title="Archive student" onClick={() => archiveStudent(student)} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Archive size={16} /></button>}</div></td>
              </tr>
            ))}
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading students...</td></tr>}
            {!loading && !filteredStudents.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><Users className="mx-auto mb-2" size={20} />No students match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Edit Student Profile</h2><button title="Close" onClick={() => setEditing(null)} className="rounded-md p-1 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Full name"><input value={editing.displayName || ""} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field>
              <Field label="Parent ID"><input value={editing.parentId || ""} readOnly className="w-full rounded-md border bg-slate-50 px-3 py-2 text-slate-600" /></Field>
              <Field label="Class"><select value={editing.classId || ""} onChange={(event) => setEditing({ ...editing, classId: event.target.value, streamId: "" })} className="w-full rounded-md border px-3 py-2"><option value="">Unassigned</option>{options.classes.map((item) => <option key={item.id} value={item.classId || item.id}>{item.name}</option>)}</select></Field>
              <Field label="Stream"><select value={editing.streamId || editing.stream || ""} onChange={(event) => setEditing({ ...editing, streamId: event.target.value, stream: event.target.value })} className="w-full rounded-md border px-3 py-2"><option value="">Unassigned</option>{options.streams.filter((item) => !editing.classId || item.classId === editing.classId).map((item) => <option key={item.id} value={item.streamId || item.id}>{item.name}</option>)}</select></Field>
              <Field label="Gender"><select value={editing.gender || ""} onChange={(event) => setEditing({ ...editing, gender: event.target.value })} className="w-full rounded-md border px-3 py-2"><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option></select></Field>
              <Field label="Status"><select value={statusOf(editing)} onChange={(event) => setEditing({ ...editing, status: event.target.value as StudentDirectoryRecord["status"] })} className="w-full rounded-md border px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} onClick={saveStudent} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}
