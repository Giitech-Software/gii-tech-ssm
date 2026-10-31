import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function BrandedLogin() {
  const { login } = useAuth(); const navigate = useNavigate(); const [id, setId] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(""); try { await login(id, password); navigate("/"); } catch (value) { setError(value instanceof Error ? value.message : "Unable to sign in."); } finally { setLoading(false); } };
  const reset = () => navigate("/reset-password");
  return <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-10"><p className="text-sm font-black tracking-tight text-primary">ASTEM-SSM <span aria-hidden="true">|</span> <span className="font-bold">Secure school portal</span></p><h1 className="mt-3 text-3xl font-black text-slate-900">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in with the school ID issued by your administrator.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">School ID or email<input required className="input mt-1" value={id} onChange={event => setId(event.target.value)} placeholder="Enter your school ID or email" /></label><label className="block text-sm font-semibold">Password<div className="relative mt-1"><input required type={show ? "text" : "password"} className="input pr-11" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" /><button type="button" onClick={() => setShow(value => !value)} className="absolute inset-y-0 right-3 text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button disabled={loading} className="btn-primary w-full py-3">{loading ? "Signing in..." : "Login"}</button><button type="button" disabled={loading} onClick={() => void reset()} className="w-full text-sm font-bold text-primary">Forgot password?</button><button type="button" disabled={loading} onClick={() => navigate("/signup")} className="w-full text-sm font-bold text-slate-700">Request an account</button></form></div><footer className="mt-6 text-xs text-white/70">ASTEM-SSM, all rights reserved.</footer></div>;
}





