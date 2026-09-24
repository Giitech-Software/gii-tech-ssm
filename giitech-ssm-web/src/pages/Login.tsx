import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 NEW
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSent(false);
    setLoading(true);

    try {
      await login(id, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setResetSent(false);
    setLoading(true);
    try {
      await resetPassword(id);
      setResetSent(true);
    } catch (err: any) {
      setError(err?.code === "auth/user-not-found" ? "No account was found for that User ID." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-primary via-blue-900 to-sky-700 p-10 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-200">ASTEM-SSM</p><h2 className="mt-8 text-4xl font-black leading-tight">Your school,<br />connected.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">A secure workspace for teaching, learning, attendance, and school operations.</p></div><p className="text-xs text-blue-200">School management, designed for clarity.</p></div>
        <div className="p-7 sm:p-10"><p className="eyebrow">Secure school portal</p><h1 className="mt-2 text-3xl font-black tracking-tight text-dark">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in with the school ID issued by your administrator.</p>

        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
        {resetSent && <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Password reset instructions sent to the account email.</div>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">User ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              className="input"
              placeholder="Enter your ID (e.g. STU001)"
            />
          </div>

          {/* PASSWORD FIELD */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Password</label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}   // 👈 Toggle here
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input pr-10"
                placeholder="••••••••"
              />

              {/* 👁️ Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-neutral"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <button type="button" onClick={handleReset} disabled={loading} className="w-full text-sm font-medium text-primary hover:underline disabled:opacity-50">
            Forgot password?
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
