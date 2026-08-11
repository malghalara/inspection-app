const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
    },
  });
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export function registerUser(name: string, email: string, password: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function verifyAccount(email: string, otp: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function resendVerification(email: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function loginUser(email: string, password: string) {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return apiFetch<TokenResponse>(`/api/v1/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
  });
}

export function logoutUser(refreshToken: string) {
  return apiFetch<{ message: string }>(`/api/v1/auth/logout?refresh_token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyPasswordResetOtp(email: string, otp: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/password-reset/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function confirmPasswordReset(resetToken: string, newPassword: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
  });
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListUsersParams {
  page?: number;
  page_size?: number;
  role?: string;
  is_active?: boolean;
  search?: string;
}

export function listUsers(params: ListUsersParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.role) query.set("role", params.role);
  if (params.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params.search) query.set("search", params.search);

  const qs = query.toString();
  return authFetch<UserListResponse>(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
}

export function updateUserRole(userId: string, role: string) {
  return authFetch<{ message: string }>(`/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function updateUserActive(userId: string, isActive: boolean) {
  return authFetch<{ message: string }>(`/api/v1/admin/users/${userId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export interface Domain {
  id: string;
  title: string;
  passing_criteria_percent: number;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function listDomains() {
  return authFetch<Domain[]>("/api/v1/admin/domains");
}

export function createDomain(title: string, passingCriteriaPercent: number) {
  return authFetch<Domain>("/api/v1/admin/domains", {
    method: "POST",
    body: JSON.stringify({ title, passing_criteria_percent: passingCriteriaPercent }),
  });
}

export function updateDomain(
  domainId: string,
  updates: { title?: string; passing_criteria_percent?: number }
) {
  return authFetch<Domain>(`/api/v1/admin/domains/${domainId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteDomain(domainId: string) {
  return authFetch<{ message: string }>(`/api/v1/admin/domains/${domainId}`, {
    method: "DELETE",
  });
}

export function reorderDomains(orderedIds: string[]) {
  return authFetch<{ message: string }>("/api/v1/admin/domains/reorder", {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}