"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { registerUser, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name, email, password);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Step 1 of 2 — tell us about you."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>

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
          <label htmlFor="password" className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            At least 8 characters.
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "var(--dark)" }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}