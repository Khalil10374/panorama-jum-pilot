import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import Button from "../components/Button";
import { api, setSession } from "../lib/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@panoramajum.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await api.login(email, password);
      setSession(session);
      onLogin(session.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page min-h-screen">
      <div className="login-shell">
        <section className="login-visual text-white">
          <div className="login-brand flex items-center gap-3">
            <img src="/panorama-logo.png" alt="Panorama Jum logo" className="h-14 w-14 rounded-lg bg-white/90 object-contain p-1 shadow-sm" />
            <div>
              <p className="text-xl font-black">Panorama Jum</p>
              <p className="text-xs font-semibold text-white/70">Integrated Resort Management</p>
            </div>
          </div>

          <div className="login-photo-card">
            <img src="/slider/5.jpeg" alt="Panorama Jum resort beside the lake" />
            <div className="login-photo-caption">
              <p>Where River Meets The Mountain</p>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <form onSubmit={submit} className="login-card">
            <div className="mb-6 flex justify-center">
              <img src="/panorama-logo.png" alt="Panorama Jum logo" className="login-form-logo" />
            </div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-black text-white">Welcome back</h2>
              <p className="mt-3 text-sm font-medium text-white/50">Use your authorized account to continue.</p>
            </div>
            <label className="mb-4 grid gap-2 text-sm font-semibold text-white/70">
              Email
              <span className="login-field flex min-h-12 items-center gap-2 rounded-lg px-4">
                <Mail size={18} className="text-white/40" />
                <input className="w-full bg-transparent outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </span>
            </label>
            <label className="mb-5 grid gap-2 text-sm font-semibold text-white/70">
              Password
              <span className="login-field flex min-h-12 items-center gap-2 rounded-lg px-4">
                <LockKeyhole size={18} className="text-white/40" />
                <input className="w-full bg-transparent outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </span>
            </label>
            {error ? <p className="mb-4 rounded-lg bg-rose-500/14 p-3 text-sm font-semibold text-rose-100 ring-1 ring-rose-300/20">{error}</p> : null}
            <Button disabled={loading} className="login-submit w-full">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>
          <p className="login-form-copyright">Copyright © 2026 Panorama Jum. All rights reserved.</p>
        </section>
      </div>
    </div>
  );
}
