"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
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
    <AuthCard
      eyebrow="Welcome back"
      title="Log in"
      footer={
        <>
          Need an account?{" "}
          <Link href="/register" className="underline" style={{ color: "var(--tag-amber)" }}>
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {justVerified && (
          <div role="status" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--ok)", color: "var(--ok)", backgroundColor: "rgba(79,174,116,0.08)" }}>
            Account verified. You can log in now.
          </div>
        )}
        {justReset && (
          <div role="status" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--ok)", color: "var(--ok)", backgroundColor: "rgba(79,174,116,0.08)" }}>
            Password updated. Log in with your new password.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <Link href="/forgot-password" className="text-xs underline" style={{ color: "var(--muted)" }}>
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="font-display w-full rounded-sm px-4 py-2.5 text-sm tracking-wide transition disabled:opacity-50"
          style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}