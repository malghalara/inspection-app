"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { accessToken, isInitialized, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!accessToken) {
      router.replace("/login");
    }
  }, [isInitialized, accessToken, router]);

  if (!isInitialized || !accessToken) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: "var(--bg)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
        Signed in
      </p>
      <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
        You&apos;re authenticated
      </h1>
      <p className="max-w-sm text-center text-sm" style={{ color: "var(--text-muted)" }}>
        This is a placeholder confirming the login flow works end to end. The real dashboard gets built in a later phase.
      </p>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--dark)" }}
      >
        Log out
      </button>
    </div>
  );
}