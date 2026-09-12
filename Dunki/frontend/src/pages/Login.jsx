import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-navy text-paper px-14 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grain bg-grain opacity-[0.35] pointer-events-none" />
        <div className="relative">
          <p className="font-display text-3xl">Dunki</p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-paper/50 mt-1">
            Migrant Worker Recruitment &amp; Contract Verification
          </p>
        </div>
        <div className="relative">
          <p className="font-display text-[2.6rem] leading-[1.15] max-w-md">
            A verified record of every step, from application to arrival.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs font-mono text-paper/60">
            <span className="border border-paper/30 rounded-sm px-2 py-1 rotate-[-4deg]">
              VERIFIED AGENCY
            </span>
            <span className="border border-paper/30 rounded-sm px-2 py-1 rotate-[3deg]">
              CONTRACT LOCKED
            </span>
            <span className="border border-paper/30 rounded-sm px-2 py-1 rotate-[-2deg]">
              RECEIPT ISSUED
            </span>
          </div>
        </div>
        <p className="relative text-xs text-paper/40">
          © 2026 Dunki. Built for migrant worker protection.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16 bg-paper">
        <div className="w-full max-w-sm">
          <p className="font-display text-2xl text-navy md:hidden mb-8">
            Dunki
          </p>
          <h1 className="font-display text-3xl text-navy">Welcome back</h1>
          <p className="text-sm text-navy/60 mt-2">
            Sign in to track your recruitment journey.
          </p>

          {error && (
            <p className="mt-4 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>

            <div className="flex items-center justify-between text-xs text-navy/60">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-stamp" />
                Remember me
              </label>
              <a href="#" className="text-navy/70 underline underline-offset-2">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-card bg-navy text-paper text-sm font-medium py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-navy/60 mt-8">
            New to Dunki?{" "}
            <Link
              to="/register"
              className="text-navy font-medium underline underline-offset-2"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
