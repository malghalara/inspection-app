"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { requestPasswordReset, verifyPasswordResetOtp, ApiError } from "@/lib/api";

type Phase = "email" | "otp" | "token";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setPhase("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyPasswordResetOtp(email, otp);
      setPhase("token");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  function handleTokenSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    router.push(`/reset-password?token=${encodeURIComponent(manualToken.trim())}`);
  }

  const title = phase === "email" ? "Forgot password" : phase === "otp" ? "Enter the code" : "Enter reset link";
  const subtitle =
    phase === "email" ? "We'll send a reset code to your email." : phase === "otp" ? "Confirm it's you." : "Almost done.";

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
            Back to login
          </Link>
        </>
      }
    >
      {phase === "email" && (
        <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
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

          {error && (
            <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "var(--dark)" }}
          >
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>
      )}

      {phase === "otp" && (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            If an account exists for <span style={{ color: "var(--text)" }}>{email}</span>, a 6-digit code was sent. Check your backend terminal (dev mode).
          </p>

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
          </div>

          {error && (
            <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "var(--dark)" }}
          >
            {loading ? "Checking…" : "Verify code"}
          </button>
        </form>
      )}

      {phase === "token" && (
        <form onSubmit={handleTokenSubmit} className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            A reset link was sent to your email. In dev mode, copy the{" "}
            <span className="font-mono-tag" style={{ color: "var(--text)" }}>
              token=
            </span>{" "}
            value from the link logged in your backend terminal, and paste it below.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Reset token
            </label>
            <input
              id="token"
              type="text"
              required
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="font-mono-tag w-full rounded-lg border px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              placeholder="Paste the token from the reset link"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition"
            style={{ backgroundColor: "var(--dark)" }}
          >
            Continue
          </button>
        </form>
      )}
    </AuthShell>
  );
}