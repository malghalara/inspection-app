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
  inspection_status?: string;
  overall_status?: string;
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
  has_inspection?: boolean;
  inspection_status?: string;
  overall_status?: string;
}

export function listUsers(params: ListUsersParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.role) query.set("role", params.role);
  if (params.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params.search) query.set("search", params.search);
  if (params.has_inspection !== undefined) query.set("has_inspection", String(params.has_inspection));
  if (params.inspection_status) query.set("inspection_status", params.inspection_status);
  if (params.overall_status) query.set("overall_status", params.overall_status);

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

export interface Question {
  id: string;
  title: string;
  domain_id: string;
  options: string[];
  is_critical: boolean;
  proof_required: boolean;
  order: number;
  reference_code: string | null;
  regulation_tag: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionCreatePayload {
  title: string;
  domain_id: string;
  is_critical?: boolean;
  proof_required?: boolean;
  order?: number;
  reference_code?: string;
  regulation_tag?: string;
}

export interface QuestionUpdatePayload {
  title?: string;
  domain_id?: string;
  is_critical?: boolean;
  proof_required?: boolean;
  order?: number;
  reference_code?: string;
  regulation_tag?: string;
}

export function listQuestions(domainId?: string) {
  const qs = domainId ? `?domain_id=${encodeURIComponent(domainId)}` : "";
  return authFetch<Question[]>(`/api/v1/admin/questions${qs}`);
}

export function createQuestion(payload: QuestionCreatePayload) {
  return authFetch<Question>("/api/v1/admin/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateQuestion(questionId: string, payload: QuestionUpdatePayload) {
  return authFetch<Question>(`/api/v1/admin/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteQuestion(questionId: string, force = false) {
  const qs = force ? "?force=true" : "";
  return authFetch<{ message: string }>(`/api/v1/admin/questions/${questionId}${qs}`, {
    method: "DELETE",
  });
}

export function reorderQuestions(orderedIds: string[]) {
  return authFetch<{ message: string }>("/api/v1/admin/questions/reorder", {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}
export interface DomainProgress {
  domain_id: string;
  title: string;
  order: number;
  passing_criteria_percent: number;
  answered_count: number;
  total_count: number;
  yes_count: number;
  no_count: number;
  na_count: number;
  score_percent: number;
  domain_status: "in_progress" | "passed" | "failed";
}

export interface InspectionProgress {
  inspection_status: "in_progress" | "submitted";
  overall_status: "in_progress" | "passed" | "failed";
  domains: DomainProgress[];
}

export interface ProofFile {
  url: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface QuestionWithAnswer {
  id: string;
  title: string;
  domain_id: string;
  options: string[];
  is_critical: boolean;
  proof_required: boolean;
  order: number;
  reference_code: string | null;
  regulation_tag: string | null;
  value: string | null;
  proof_files: ProofFile[];
}

export function getInspectionProgress() {
  return authFetch<InspectionProgress>("/api/v1/inspection/progress");
}

export function getInspectionDomainQuestions(domainId: string) {
  return authFetch<QuestionWithAnswer[]>(`/api/v1/inspection/domains/${domainId}/questions`);
}

export function upsertAnswer(questionId: string, value: "Yes" | "No" | "N/A") {
  return authFetch<{ question_id: string; domain_id: string; value: string | null }>(
    "/api/v1/inspection/answers",
    { method: "PUT", body: JSON.stringify({ question_id: questionId, value }) }
  );
}

export function submitInspection() {
  return authFetch<{ message: string; overall_status: string }>("/api/v1/inspection/submit", {
    method: "POST",
  });
}

export function reopenInspection() {
  return authFetch<{ message: string }>("/api/v1/inspection/reopen", { method: "POST" });
}

export async function uploadProofFile(questionId: string, file: File) {
  const formData = new FormData();
  formData.append("question_id", questionId);
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/uploads/proof`, {
    method: "POST",
    headers: currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {},
    body: formData,
  });

  if (!res.ok) {
    let detail = "Upload failed. Please try again.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // not JSON, keep default message
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<{ question_id: string; domain_id: string; value: string | null; proof_files: ProofFile[] }>;
}