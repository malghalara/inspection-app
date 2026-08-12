"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AdminNav } from "@/components/admin/AdminNav";
import { API_BASE_URL, getUserInspectionSubmission, type AdminUserSubmissionResponse, type ApiError } from "@/lib/api";

export default function AdminUserInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, role, isInitialized } = useAuth();

  const [submission, setSubmission] = useState<AdminUserSubmissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmission = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getUserInspectionSubmission(id);
      setSubmission(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load submission.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isInitialized) return;
    if (accessToken === null) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [accessToken, role, isInitialized, router]);

  useEffect(() => {
    if (!isInitialized || !accessToken || role !== "admin") return;
    loadSubmission();
  }, [isInitialized, accessToken, role, loadSubmission]);

  if (!isInitialized || !accessToken || role !== "admin") return null;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
              Review submission
            </p>
            <h1 className="font-display mt-1 text-2xl" style={{ color: "var(--text)" }}>
              {submission ? submission.user_name : "User submission"}
            </h1>
          </div>
          <Link
            href="/admin/users"
            className="rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Back to users
          </Link>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading submission…
          </p>
        ) : error ? (
          <div role="alert" className="rounded-lg bg-[var(--critical-bg)] px-4 py-3 text-sm" style={{ color: "var(--critical-text)" }}>
            {error}
          </div>
        ) : submission ? (
          <div className="space-y-6">
            <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    User
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
                    {submission.user_name}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {submission.user_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Inspection status
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
                    {submission.inspection_status}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Overall status
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
                    {submission.overall_status}
                  </p>
                </div>
              </div>
            </div>

            {submission.domains.map((domain) => (
              <section key={domain.domain_id} className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                      {domain.title}
                    </h2>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Passing criteria: {domain.passing_criteria_percent}%
                    </p>
                  </div>
                  <p className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Questions: {domain.questions.length}
                  </p>
                </div>

                <div className="mt-4 space-y-4">
                  {domain.questions.map((question) => (
                    <div key={question.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                            {question.title}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {question.reference_code ?? ""} {question.regulation_tag ? `· ${question.regulation_tag}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="rounded-full bg-[var(--tag-bg)] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                            {question.is_critical ? "Critical" : "Standard"}
                          </span>
                          <span className="rounded-full bg-[var(--tag-bg)] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                            {question.proof_required ? "Proof required" : "No proof"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                          Answer
                        </p>
                        <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
                          {question.value ?? "No answer provided"}
                        </p>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                          Proof files
                        </p>
                        {question.proof_files.length === 0 ? (
                          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                            None
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {question.proof_files.map((file) => (
                              <li key={file.url}>
                                <a
                                  href={file.url.startsWith("http") ? file.url : `${API_BASE_URL}${file.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium underline"
                                  style={{ color: "var(--primary)" }}
                                >
                                  {file.filename}
                                </a>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {Math.round(file.size_bytes / 1024)} KB · {file.mime_type}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No submission data available.
          </p>
        )}
      </div>
    </div>
  );
}
