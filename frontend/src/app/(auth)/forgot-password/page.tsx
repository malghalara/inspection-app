"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
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

  return (
    <AuthCard
      eyebrow={phase === "email" ? "Reset password" : phase === "otp" ? "Confirm it's you" : "Almost done"}
      title={phase === "email" ? "Forgot password" : phase === "otp" ? "Enter the code" : "Enter reset link"}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--tag-amber)" }}>
            Back to login
          </Link>
        </>
      }
    >
      {phase === "email" && (
        <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
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
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>
      )}

      {phase === "otp" && (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            If an account exists for <span style={{ color: "var(--paper)" }}>{email}</span>, a 6-digit code was sent. Check your backend terminal (dev mode).
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp" className="text-xs" style={{ color: "var(--muted)" }}>
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
              className="font-mono-tag w-full rounded-sm border bg-transparent px-3 py-2 text-center text-lg tracking-[0.5em] outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
              style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
              placeholder="000000"
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
            {loading ? "Checking…" : "Verify code"}
          </button>
        </form>
      )}

      {phase === "token" && (
        <form onSubmit={handleTokenSubmit} className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            A reset link was sent to your email. In dev mode, copy the{" "}
            <span className="font-mono-tag" style={{ color: "var(--paper)" }}>
              token=
            </span>{" "}
            value from the link logged in your backend terminal, and paste it below.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-xs" style={{ color: "var(--muted)" }}>
              Reset token
            </label>
            <input
              id="token"
              type="text"
              required
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="font-mono-tag w-full rounded-sm border bg-transparent px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
              style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
              placeholder="Paste the token from the reset link"
            />
          </div>

          <button
            type="submit"
            className="font-display w-full rounded-sm px-4 py-2.5 text-sm tracking-wide transition"
            style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
          >
            Continue
          </button>
        </form>
      )}
    </AuthCard>
  );
}