import { useEffect, useState } from "react";
import { fetchSignupOptions, submitSignupRequest, type SignupOptions, type SignupRole } from "../services/SignupRequestService";

const emptyForm = { name: "", phone: "", email: "", students: "", department: "", classId: "", stream: "", subject: "" };

export default function SignupPage() {
  const [role, setRole] = useState<SignupRole>("parent");
  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState<SignupOptions>({ departments: [], subjects: [], classes: [], streams: [] });
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { void fetchSignupOptions().then(setOptions).catch(() => undefined); }, []);
  const set = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const extra = role === "parent" ? { studentIds: form.students.split(",").map((v) => v.trim()).filter(Boolean) } : role === "student" ? { departmentId: form.department, classId: form.classId, streamId: form.stream } : role === "teacher" ? { departmentId: form.department, subject: form.subject } : { departmentId: form.department };
      await submitSignupRequest({ role, displayName: form.name, phone: form.phone, email: form.email, extra });
      setForm(emptyForm); setMessage("Request submitted. An administrator will review it and provide your login details.");
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to submit request."); } finally { setSaving(false); }
  };
  const text = (key: keyof typeof emptyForm, placeholder: string, required = false) => <input className="input mt-1" required={required} placeholder={placeholder} value={form[key]} onChange={(e) => set(key, e.target.value)} />;
  const select = (key: keyof typeof emptyForm, label: string, items: { id: string; name: string }[]) => <select className="input mt-1" value={form[key]} onChange={(e) => set(key, e.target.value)}><option value="">{label}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>;
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"><p className="eyebrow">ASTEM-SSM onboarding</p><h1 className="mt-2 text-3xl font-black text-dark">Request an account</h1>{message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Account type<select className="input mt-1" value={role} onChange={(e) => setRole(e.target.value as SignupRole)}><option value="parent">Parent / guardian</option><option value="student">Student</option><option value="teacher">Teacher</option><option value="staff">Non-teaching staff</option></select></label><label className="block text-sm font-semibold">Full name{text("name", "Full name", true)}</label><label className="block text-sm font-semibold">Phone{text("phone", "Phone number", role !== "student")}</label><label className="block text-sm font-semibold">Email{text("email", "Email (optional)")}</label>{role === "parent" && <label className="block text-sm font-semibold">Child/student IDs{text("students", "e.g. STU001, STU002", true)}</label>}{role === "student" && <><label className="block text-sm font-semibold">Department{select("department", "Select department", options.departments)}</label><label className="block text-sm font-semibold">Class{select("classId", "Select class", options.classes)}</label><label className="block text-sm font-semibold">Stream{select("stream", "Select stream", options.streams.filter((v) => !form.classId || v.classId === form.classId))}</label></>}{(role === "teacher" || role === "staff") && <label className="block text-sm font-semibold">Department{select("department", "Select department", options.departments)}</label>}{role === "teacher" && <label className="block text-sm font-semibold">Primary subject{select("subject", "Select subject", options.subjects)}</label>}<button disabled={saving} className="btn-primary w-full py-3">{saving ? "Submitting..." : "Submit signup request"}</button></div></form></main>;
}
