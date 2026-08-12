"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { verifyAccount, resendVerification, ApiError } from "@/lib/api";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await verifyAccount(email, otp);
      router.push(`/login?verified=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    setError(null);
    try {
      await resendVerification(email);
    } finally {
      setNotice("If that account exists and is unverified, a new code has been sent.");
      setResendCooldown(30);
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Step 2 of 2 — enter the code we sent you."
      footer={
        <>
          Wrong email?{" "}
          <Link href="/register" className="font-medium" style={{ color: "var(--primary)" }}>
            Start over
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <label htmlFor="otp" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            6-digit code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="font-mono-tag w-full rounded-lg border px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            placeholder="000000"
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Check your backend terminal for the code (dev mode).
          </span>
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
        {notice && (
          <div
            role="status"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--success-soft-bg)", color: "var(--success)" }}
          >
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "var(--dark)" }}
        >
          {loading ? "Verifying…" : "Verify account"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm disabled:opacity-50"
          style={{ color: "var(--primary)" }}
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}