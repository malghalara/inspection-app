"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  reorderDomains,
  ApiError,
  type Domain,
} from "@/lib/api";

export default function AdminDomainsPage() {
  const { accessToken, role, isInitialized } = useAuth();
  const router = useRouter();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newPercent, setNewPercent] = useState(90);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPercent, setEditPercent] = useState(0);

  useEffect(() => {
    if (!isInitialized) return;
    if (accessToken === null) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isInitialized, accessToken, role, router]);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDomains();
      setDomains(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load domains.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken && role === "admin") {
      fetchDomains();
    }
  }, [accessToken, role, fetchDomains]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setActionError(null);
    setCreating(true);
    try {
      await createDomain(newTitle.trim(), newPercent);
      setNewTitle("");
      setNewPercent(90);
      fetchDomains();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create domain.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(d: Domain) {
    setEditingId(d.id);
    setEditTitle(d.title);
    setEditPercent(d.passing_criteria_percent);
  }

  async function saveEdit(id: string) {
    setActionError(null);
    try {
      await updateDomain(id, { title: editTitle.trim(), passing_criteria_percent: editPercent });
      setEditingId(null);
      fetchDomains();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update domain.");
    }
  }

  async function handleDelete(d: Domain) {
    setActionError(null);
    try {
      await deleteDomain(d.id);
      fetchDomains();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete domain.");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= domains.length) return;

    const reordered = [...domains];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setDomains(reordered); // optimistic update

    setActionError(null);
    try {
      await reorderDomains(reordered.map((d) => d.id));
      fetchDomains();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to reorder domains.");
      fetchDomains(); // revert to server state on failure
    }
  }

  if (!isInitialized || !accessToken || role !== "admin") return null;

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "var(--ink)", color: "var(--paper)" }}>
      <div className="mx-auto max-w-3xl">
        <AdminNav />

        <p className="font-display text-xs" style={{ color: "var(--tag-amber)" }}>
          Admin
        </p>
        <h1 className="font-display mb-6 text-2xl">Domain Management</h1>

        <form
          onSubmit={handleCreate}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-sm border p-4"
          style={{ borderColor: "var(--panel-border)", backgroundColor: "var(--panel)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              New domain title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Safe"
              className="rounded-sm border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--tag-amber)]"
              style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              Passing % (1–100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={newPercent}
              onChange={(e) => setNewPercent(Number(e.target.value))}
              className="w-24 rounded-sm border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--tag-amber)]"
              style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="font-display rounded-sm px-4 py-2.5 text-sm tracking-wide transition disabled:opacity-50"
            style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
          >
            {creating ? "Adding…" : "Add domain"}
          </button>
        </form>

        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-sm border px-3 py-2 text-sm"
            style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-sm border px-3 py-2 text-sm"
            style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}
          >
            {error}
          </div>
        ) : domains.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No domains yet — add your first one above.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {domains.map((d, index) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-sm border p-3"
                style={{ borderColor: "var(--panel-border)", backgroundColor: "var(--panel)" }}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    className="rounded-sm border px-1.5 text-xs disabled:opacity-30"
                    style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === domains.length - 1}
                    className="rounded-sm border px-1.5 text-xs disabled:opacity-30"
                    style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
                  >
                    ▼
                  </button>
                </div>

                <span className="font-mono-tag w-8 text-xs" style={{ color: "var(--muted)" }}>
                  #{d.order}
                </span>

                {editingId === d.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--tag-amber)]"
                      style={{ borderColor: "var(--panel-border)", color: "var(--paper)", minWidth: "120px" }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editPercent}
                      onChange={(e) => setEditPercent(Number(e.target.value))}
                      className="w-20 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--tag-amber)]"
                      style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
                    />
                    <button
                      onClick={() => saveEdit(d.id)}
                      className="font-display rounded-sm px-3 py-1 text-xs"
                      style={{ backgroundColor: "var(--tag-amber)", color: "var(--ink)" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-sm border px-3 py-1 text-xs"
                      style={{ borderColor: "var(--panel-border)", color: "var(--muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span style={{ color: "var(--paper)" }}>{d.title}</span>
                      <span className="ml-3 text-xs" style={{ color: "var(--muted)" }}>
                        {d.passing_criteria_percent}% to pass
                      </span>
                    </div>
                    <button
                      onClick={() => startEdit(d)}
                      className="rounded-sm border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="rounded-sm border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--err)", color: "var(--err)" }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}