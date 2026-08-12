"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminNav } from "@/components/admin/AdminNav";
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
  const [hasInspection, setHasInspection] = useState(false);
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState("");
  const [overallStatusFilter, setOverallStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        has_inspection: hasInspection || undefined,
        inspection_status: inspectionStatusFilter || undefined,
        overall_status: overallStatusFilter || undefined,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activeFilter, search, hasInspection, inspectionStatusFilter, overallStatusFilter]);

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
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <h1 className="font-display mb-6 text-2xl" style={{ color: "var(--text)" }}>
          User Management
        </h1>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setPage(1);
              setActiveFilter(e.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
          <select
            value={inspectionStatusFilter}
            onChange={(e) => {
              setPage(1);
              setInspectionStatusFilter(e.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
          >
            <option value="">Any inspection status</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
          </select>
          <select
            value={overallStatusFilter}
            onChange={(e) => {
              setPage(1);
              setOverallStatusFilter(e.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
          >
            <option value="">Any overall status</option>
            <option value="in_progress">In Progress</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={hasInspection}
              onChange={(e) => {
                setPage(1);
                setHasInspection(e.target.checked);
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Has inspection
          </label>
        </div>

        {actionError && (
          <div role="alert" className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
            {actionError}
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : error ? (
          <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border shadow-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--tag-bg)" }}>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Name</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Email</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Role</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Verified</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Inspection</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Overall</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Joined</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--text)" }}>{u.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: u.role === "admin" ? "var(--primary-soft-bg)" : "var(--tag-bg)",
                          color: u.role === "admin" ? "var(--primary-soft-text)" : "var(--tag-text)",
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: u.is_verified ? "var(--success)" : "var(--text-muted)" }}>
                      {u.is_verified ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3" style={{ color: u.inspection_status ? "var(--text)" : "var(--text-muted)" }}>
                      {u.inspection_status ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: u.overall_status ? "var(--text)" : "var(--text-muted)" }}>
                      {u.overall_status ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: u.is_active ? "var(--success-soft-bg)" : "var(--critical-bg)",
                          color: u.is_active ? "var(--success)" : "var(--critical-text)",
                        }}
                      >
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleToggle(u)}
                          className="rounded-lg border px-2 py-1 text-xs font-medium"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => handleActiveToggle(u)}
                          className="rounded-lg border px-2 py-1 text-xs font-medium"
                          style={{
                            borderColor: u.is_active ? "var(--critical-text)" : "var(--success)",
                            color: u.is_active ? "var(--critical-text)" : "var(--success)",
                          }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: "var(--text-muted)" }}>
          <span>Page {page} of {totalPages} — {total} total users</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-1 disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border px-3 py-1 disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}