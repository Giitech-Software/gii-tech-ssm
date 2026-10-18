import { useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../../firebaseConfig";

type Result = { tenantId: string; schoolName: string; adminId: string; loginEmail: string };
type CreateSchoolInput = { schoolName: string; schoolCode: string; adminName: string; adminEmail: string; phone: string; password: string };
const functions = getFunctions(app, "africa-south1");

export default function CreateSchoolPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResult(null);
    try {
      const create = httpsCallable<CreateSchoolInput, Result>(functions, "createTenantWithAdmin");
      const payload = { schoolName, schoolCode, adminName, adminEmail, phone, password };
      setResult((await create(payload)).data);
      setSchoolName(""); setSchoolCode(""); setAdminName(""); setAdminEmail(""); setPhone(""); setPassword("");
    } catch (value) {
      setError(value instanceof Error ? value.message.replace(/^FirebaseError:\s*/, "") : "Unable to create the school.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="mx-auto max-w-4xl space-y-6">
    <header><p className="eyebrow">Platform management</p><h1 className="text-3xl font-black text-dark">Create a school</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Provision a new tenant and its first Tenant Admin. The school will be isolated from all other schools.</p></header>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {result && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> School created successfully</div><p className="mt-2">{result.schoolName} · Tenant ID: <strong>{result.tenantId}</strong></p><p className="mt-1">Admin Login ID: <strong>{result.adminId}</strong> · Login email: {result.loginEmail}</p><p className="mt-2 text-xs">Give the Admin the temporary password entered above through a secure channel.</p></div>}
    <form onSubmit={submit} className="surface space-y-6 p-6">
      <section><h2 className="flex items-center gap-2 font-black text-dark"><Building2 size={19} /> School details</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="School name" value={schoolName} setValue={setSchoolName} required placeholder="e.g. Sunrise Academy" /><Field label="School code" value={schoolCode} setValue={setSchoolCode} required placeholder="e.g. sunrise-academy" hint="Used as the permanent tenant ID." /></div></section>
      <section><h2 className="font-black text-dark">First Tenant Admin</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Full name" value={adminName} setValue={setAdminName} required placeholder="Administrator name" /><Field label="Email address" type="email" value={adminEmail} setValue={setAdminEmail} required placeholder="admin@school.com" /><Field label="Phone number" type="tel" value={phone} setValue={setPhone} placeholder="024 000 0000" /><Field label="Temporary password" type="password" value={password} setValue={setPassword} required minLength={6} placeholder="At least 6 characters" /></div></section>
      <button disabled={saving} className="rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Creating school..." : "Create school and Admin"}</button>
    </form>
  </main>;
}

function Field({ label, value, setValue, hint, ...props }: { label: string; value: string; setValue: (value: string) => void; hint?: string; type?: string; required?: boolean; minLength?: number; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...props} value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100" />{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}
