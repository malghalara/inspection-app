"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { confirmPasswordReset, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Use the link from your password reset email.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(token, newPassword);
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Reset password"
      footer={
        <>
          Changed your mind?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!token && (
          <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
            No reset token found in the URL. Go back to{" "}
            <Link href="/forgot-password" className="underline">
              Forgot password
            </Link>{" "}
            and follow the link from your email.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            At least 8 characters.
          </span>
        </div>

        {error && (
          <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "var(--dark)" }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}