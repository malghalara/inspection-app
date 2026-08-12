"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginUser, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";
  const justReset = searchParams.get("reset") === "1";
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      setSession(result.access_token, result.refresh_token);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.message === "ACCOUNT_NOT_VERIFIED") {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-2xl border p-8 shadow-sm"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="mb-6 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa, #34d399)" }}
        >
          M
        </div>
        <span className="font-display text-lg" style={{ color: "var(--text)" }}>
          Mock Inspection
        </span>
      </div>

      <h1 className="font-display mb-1 text-xl" style={{ color: "var(--text)" }}>
        Log in
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Welcome back — enter your details below.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {justVerified && (
          <div
            role="status"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--success-soft-bg)", color: "var(--success)" }}
          >
            Account verified. You can log in now.
          </div>
        )}
        {justReset && (
          <div
            role="status"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--success-soft-bg)", color: "var(--success)" }}
          >
            Password updated. Log in with your new password.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Password
            </label>
            <Link href="/forgot-password" className="text-xs" style={{ color: "var(--primary)" }}>
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "var(--dark)" }}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Need an account?{" "}
        <Link href="/register" className="font-medium" style={{ color: "var(--primary)" }}>
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}