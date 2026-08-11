"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
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
    <AuthCard
      eyebrow="Step 1 of 2"
      title="Create account"
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--tag-amber)" }}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs" style={{ color: "var(--muted)" }}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
        </div>

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
          <label htmlFor="password" className="text-xs" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            At least 8 characters.
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-sm border px-3 py-2 text-sm"
            style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="font-display w-full rounded-sm px-4 py-2.5 text-sm tracking-wide transition disabled:opacity-50"
          style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}