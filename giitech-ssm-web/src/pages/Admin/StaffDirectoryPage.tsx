import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Search, UserPlus, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchAcademicOptions,
  fetchStaffDirectory,
  updateStaffProfile,
  type AcademicOption,
  type StaffDirectoryRecord,
} from "../../services/DirectoryService";
import { useAuth } from "../../contexts/AuthContext";
import { logActivity } from "../../utils/firestoreHelpers";

const statusOf = (staff: StaffDirectoryRecord) => staff.status || "active";

export default function StaffDirectoryPage() {
  const { role, user } = useAuth();
  const [staff, setStaff] = useState<StaffDirectoryRecord[]>([]);
  const [departments, setDepartments] = useState<AcademicOption[]>([]);
  const [editing, setEditing] = useState<StaffDirectoryRecord | null>(null);
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [records, options] = await Promise.all([fetchStaffDirectory(), fetchAcademicOptions()]);
      setStaff(records);
      setDepartments(options.departments);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load the staff directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStaff = useMemo(() => {
    const term = query.trim().toLowerCase();
    return staff.filter((member) => {
      const memberDepartment = member.departmentId || member.department;
      const matchesTerm = !term || member.displayName?.toLowerCase().includes(term) || member.teacherId?.toLowerCase().includes(term) || member.email?.toLowerCase().includes(term);
      return matchesTerm && (!departmentId || memberDepartment === departmentId) && (!status || statusOf(member) === status);
    });
  }, [departmentId, query, staff, status]);

  const saveStaff = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateStaffProfile(editing.id, editing);
      await logActivity(user?.uid || "", "update_staff_profile", { teacherId: editing.teacherId || editing.id });
      setEditing(null);
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the staff profile.");
    } finally {
      setSaving(false);
    }
  };

  const archiveStaff = async (member: StaffDirectoryRecord) => {
    if (!window.confirm(`Archive ${member.displayName}'s staff record?`)) return;
    await updateStaffProfile(member.id, { status: "archived" });
    await logActivity(user?.uid || "", "archive_staff_profile", { teacherId: member.teacherId || member.id });
    await loadData();
  };

  const departmentName = (member: StaffDirectoryRecord) => {
    const id = member.departmentId || member.department;
    return departments.find((item) => item.id === id)?.name || id || "-";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow">Academic operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-dark">Staff directory</h1><p className="mt-1 text-sm text-slate-500">Maintain teaching staff profiles and assignments.</p></div>
        {role === "superadmin" && <Link to="/superadmin/create-user" className="btn-primary"><UserPlus size={17} /> Add Staff</Link>}
      </div>
      <div className="surface grid gap-3 p-4 sm:grid-cols-3">
        <label className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, or email" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" /></label>
        <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="rounded-md border px-3 py-2 text-sm"><option value="">All departments</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
      </div>
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="table-container">
        <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Staff Member</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y">
            {!loading && filteredStaff.map((member) => <tr key={member.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-medium text-slate-900">{member.displayName}</p><p className="text-xs text-slate-500">{member.teacherId || member.id} | {member.email || "No email"}</p></td><td className="px-4 py-3">{departmentName(member)}</td><td className="px-4 py-3 text-slate-600">{member.subject || member.subjectId || "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusOf(member) === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{statusOf(member)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button title="Edit staff member" onClick={() => setEditing(member)} className="rounded-md p-2 text-primary hover:bg-primary"><Pencil size={16} /></button>{statusOf(member) !== "archived" && <button title="Archive staff member" onClick={() => archiveStaff(member)} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Archive size={16} /></button>}</div></td></tr>)}
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading staff...</td></tr>}
            {!loading && !filteredStaff.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><Users className="mx-auto mb-2" size={20} />No staff members match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-2xl bg-white shadow-xl"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Edit Staff Profile</h2><button title="Close" onClick={() => setEditing(null)} className="rounded-md p-1 hover:bg-slate-100"><X size={18} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Full name"><input value={editing.displayName || ""} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field>
        <Field label="Phone"><input value={editing.phone || ""} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field>
        <Field label="SSNIT number"><input value={editing.ssnitNumber || ""} onChange={(event) => setEditing({ ...editing, ssnitNumber: event.target.value })} placeholder="e.g. C000000000000" className="w-full rounded-md border px-3 py-2" /></Field>
        <Field label="Department"><select value={editing.departmentId || editing.department || ""} onChange={(event) => setEditing({ ...editing, departmentId: event.target.value, department: event.target.value })} className="w-full rounded-md border px-3 py-2"><option value="">Unassigned</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Subject"><input value={editing.subject || ""} onChange={(event) => setEditing({ ...editing, subject: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field>
        <Field label="Status"><select value={statusOf(editing)} onChange={(event) => setEditing({ ...editing, status: event.target.value as StaffDirectoryRecord["status"] })} className="w-full rounded-md border px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field>
      </div><div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} onClick={saveStaff} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button></div></div></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}
