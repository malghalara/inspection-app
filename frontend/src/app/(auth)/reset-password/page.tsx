"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
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
    <AuthCard
      eyebrow="Reset password"
      title="Choose a new password"
      footer={
        <>
          Changed your mind?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--tag-amber)" }}>
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!token && (
          <div role="alert" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}>
            No reset token found in the URL. Go back to{" "}
            <Link href="/forgot-password" className="underline">
              Forgot password
            </Link>{" "}
            and follow the link from your email.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-xs" style={{ color: "var(--muted)" }}>
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            At least 8 characters.
          </span>
        </div>

        {error && (
          <div role="alert" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="font-display w-full rounded-sm px-4 py-2.5 text-sm tracking-wide transition disabled:opacity-50"
          style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}