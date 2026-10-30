import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import { DEFAULT_COUNTRY_CODE, TENANT_ID } from "../../config/tenant";

type Audience = "parents" | "teachingStaff" | "nonTeachingStaff" | "allStaff";
type Recipient = { id: string; name: string; phone: string; role: string; departmentId: string; category: string };
const audienceOptions: [Audience, string][] = [["parents", "Parents"], ["teachingStaff", "Teaching Staff"], ["nonTeachingStaff", "Non-teaching Staff"], ["allStaff", "All Staff"]];
const normalize = (value: string) => { const compact = value.trim().replace(/[\s().-]/g, ""); const number = compact.startsWith("0") ? `${DEFAULT_COUNTRY_CODE}${compact.slice(1)}` : compact; return /^\+[1-9]\d{7,14}$/.test(number) ? number : ""; };
const category = (value: string) => /pre|nursery|kg|kindergarten/i.test(value) ? "Preschool" : /primary|basic/i.test(value) ? "Primary" : /jhs|junior/i.test(value) ? "JHS" : /shs|senior/i.test(value) ? "SHS" : "Other";

export default function BulkMessagingPage() {
  const { user } = useAuth();
  const [channel, setChannel] = useState("sms");
  const [audience, setAudience] = useState<Audience>("parents");
  const [group, setGroup] = useState("All parents");
  const [departmentId, setDepartmentId] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void (async () => {
      const [classes, parents, students, teachers, staff, deps] = await Promise.all([
        getDocs(query(collection(db, "classes"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "parents"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "students"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "teachers"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "staff"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "departments"), where("tenantId", "==", TENANT_ID))),
      ]);
      const classNames = new Map(classes.docs.map(item => [item.id, String(item.data().name || item.id)]));
      const studentGroups = new Map(students.docs.map(item => [item.id, category(`${item.data().className || ""} ${classNames.get(String(item.data().classId || "")) || ""}`)]));
      const rows: Recipient[] = [];
      parents.docs.forEach(item => { const data = item.data(); const phone = normalize(String(data.phone || data.mobile || data.phoneNumber || "")); if (phone) { const ids = Array.isArray(data.studentIds) ? data.studentIds.map(String) : data.studentId ? [String(data.studentId)] : []; rows.push({ id: item.id, name: String(data.displayName || data.name || data.email || item.id), phone, role: "Parent", departmentId: "", category: studentGroups.get(ids[0]) || category(String(data.category || data.schoolSection || "")) }); } });
      [...teachers.docs, ...staff.docs].forEach(item => { const data = item.data(); const phone = normalize(String(data.phone || data.mobile || data.phoneNumber || "")); if (phone) rows.push({ id: item.id, name: String(data.displayName || data.name || data.email || item.id), phone, role: String(data.role || (teachers.docs.some(teacher => teacher.id === item.id) ? "Teaching Staff" : "Non-teaching Staff")), departmentId: String(data.departmentId || data.department || ""), category: "" }); });
      setRecipients(rows);
      setDepartments(deps.docs.map(item => ({ id: item.id, name: String(item.data().name || item.id) })));
    })().catch(() => setRecipients([]));
  }, []);

  const visible = useMemo(() => recipients.filter(item => audience === "parents" ? item.role === "Parent" && (group === "All parents" || item.category === group) : item.role !== "Parent" && (audience === "allStaff" || (audience === "teachingStaff" ? /teach/i.test(item.role) : !/teach/i.test(item.role))) && (!departmentId || (departmentId === "__unassigned" ? !item.departmentId : item.departmentId === departmentId))), [audience, departmentId, group, recipients]);
  const allSelected = visible.length > 0 && visible.every(item => selected.includes(item.id));
  const toggle = (id: string) => setSelected(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const chosen = visible.filter(item => selected.includes(item.id)); if (!message.trim()) return setFeedback("Enter a message first."); if (!chosen.length) return setFeedback("Select at least one recipient."); try { await addDoc(collection(db, "bulkMessages"), { tenantId: TENANT_ID, channel, audience, category: audience === "parents" ? group : "", departmentId: audience === "parents" ? "" : departmentId, recipientIds: chosen.map(item => item.id), recipientPhones: chosen.map(item => item.phone), recipientCount: chosen.length, message: message.trim(), status: "queued", provider: "pending_configuration", createdBy: user?.uid || "", createdAt: serverTimestamp() }); setMessage(""); setFeedback(`${chosen.length} recipient${chosen.length === 1 ? "" : "s"} queued.`); } catch { setFeedback("Unable to queue this message."); } };

  return <main className="mx-auto max-w-4xl space-y-6"><header><h1 className="text-3xl font-black">Bulk SMS / WhatsApp</h1><p className="mt-2 text-sm text-slate-500">Choose an audience, select recipients, and queue a tenant-scoped message.</p></header><form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6"><div className="grid gap-4 md:grid-cols-2"><label>Channel<select value={channel} onChange={event => setChannel(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></label><label>Audience<select value={audience} onChange={event => { setAudience(event.target.value as Audience); setSelected([]); }} className="mt-1 w-full rounded-lg border px-3 py-2">{audienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{audience === "parents" ? <label className="block">Parent category<select value={group} onChange={event => setGroup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">{["All parents", "Preschool", "Primary", "JHS", "SHS", "Other"].map(value => <option key={value}>{value}</option>)}</select></label> : <label className="block">Staff department<select value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">All departments</option><option value="__unassigned">Unassigned</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<div className="rounded-lg border p-3"><div className="mb-2 flex items-center justify-between gap-3"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={allSelected} onChange={event => setSelected(event.target.checked ? visible.map(item => item.id) : [])}/><span>All recipients</span></label><span className="text-sm text-slate-500">{visible.length} available · {selected.length} selected</span></div>{visible.map(item => <label key={item.id} className="flex items-start gap-2 rounded border p-2"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)}/><span><strong>{item.name}</strong><small className="block text-slate-500">{item.phone} · {item.role} · {item.departmentId || "Unassigned"}</small></span></label>)}</div><textarea required rows={6} value={message} onChange={event => setMessage(event.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="Write your message..."/><button disabled={!selected.length} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">Queue message</button>{feedback && <p className="rounded-lg bg-blue-50 p-3">{feedback}</p>}</form></main>;
}
