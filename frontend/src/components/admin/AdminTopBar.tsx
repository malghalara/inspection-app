"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AdminTopBar() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <header
      className="flex items-center justify-between border-b px-6 py-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa, #34d399)" }}
        >
          M
        </div>
        <span className="font-display text-base" style={{ color: "var(--text)" }}>
          Mock Inspection
        </span>
      </div>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="rounded-lg border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
      >
        Account Management
      </button>
    </header>
  );
}