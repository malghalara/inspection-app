"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/lib/auth-context";
import { listUsers, updateUserRole, updateUserActive, ApiError, type UserListItem } from "@/lib/api";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { accessToken, role, isInitialized } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return; // wait until we've actually checked localStorage
    if (accessToken === null) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isInitialized, accessToken, role, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        page,
        page_size: PAGE_SIZE,
        role: roleFilter || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "true",
        search: search || undefined,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activeFilter, search]);

  useEffect(() => {
    if (accessToken && role === "admin") {
      fetchUsers();
    }
  }, [accessToken, role, fetchUsers]);

  async function handleRoleToggle(user: UserListItem) {
    setActionError(null);
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(user.id, newRole);
      fetchUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update role.");
    }
  }

  async function handleActiveToggle(user: UserListItem) {
    setActionError(null);
    try {
      await updateUserActive(user.id, !user.is_active);
      fetchUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!isInitialized || !accessToken || role !== "admin") return null;

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "var(--ink)", color: "var(--paper)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="font-display text-xs" style={{ color: "var(--tag-amber)" }}>
          Admin
        </p>
        <AdminNav />
        <h1 className="font-display mb-6 text-2xl">User Management</h1>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-sm border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--tag-amber)]"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
            className="rounded-sm border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          >
            <option value="" style={{ color: "black" }}>All roles</option>
            <option value="user" style={{ color: "black" }}>User</option>
            <option value="admin" style={{ color: "black" }}>Admin</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setPage(1);
              setActiveFilter(e.target.value);
            }}
            className="rounded-sm border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
          >
            <option value="" style={{ color: "black" }}>All statuses</option>
            <option value="true" style={{ color: "black" }}>Active</option>
            <option value="false" style={{ color: "black" }}>Deactivated</option>
          </select>
        </div>

        {actionError && (
          <div role="alert" className="mb-4 rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}>
            {actionError}
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : error ? (
          <div role="alert" className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "var(--err)", color: "var(--err)", backgroundColor: "rgba(226,87,76,0.08)" }}>
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm border" style={{ borderColor: "var(--panel-border)" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--panel)" }}>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Name</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Email</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Role</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Verified</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Joined</th>
                  <th className="font-display px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: "var(--panel-border)" }}>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-display rounded-sm px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: u.role === "admin" ? "rgba(232,169,58,0.15)" : "transparent",
                          color: u.role === "admin" ? "var(--tag-amber)" : "var(--muted)",
                          border: `1px solid ${u.role === "admin" ? "var(--tag-amber)" : "var(--panel-border)"}`,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: u.is_verified ? "var(--ok)" : "var(--muted)" }}>
                      {u.is_verified ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3" style={{ color: u.is_active ? "var(--ok)" : "var(--err)" }}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleToggle(u)}
                          className="rounded-sm border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--panel-border)", color: "var(--paper)" }}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => handleActiveToggle(u)}
                          className="rounded-sm border px-2 py-1 text-xs"
                          style={{ borderColor: u.is_active ? "var(--err)" : "var(--ok)", color: u.is_active ? "var(--err)" : "var(--ok)" }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
          <span>Page {page} of {totalPages} — {total} total users</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-sm border px-3 py-1 disabled:opacity-40"
              style={{ borderColor: "var(--panel-border)" }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-sm border px-3 py-1 disabled:opacity-40"
              style={{ borderColor: "var(--panel-border)" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}