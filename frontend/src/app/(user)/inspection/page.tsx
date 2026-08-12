"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getInspectionProgress,
  getInspectionDomainQuestions,
  upsertAnswer,
  submitInspection,
  reopenInspection,
  uploadProofFile,
  ApiError,
  type InspectionProgress,
  type QuestionWithAnswer,
} from "@/lib/api";

export default function InspectionPage() {
  const { accessToken, role, isInitialized, logout } = useAuth();
  const router = useRouter();

  const [progress, setProgress] = useState<InspectionProgress | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (!accessToken) router.replace("/login");
  }, [isInitialized, accessToken, router]);

  const fetchProgress = useCallback(async (showFullLoader = true) => {
  if (showFullLoader) setLoadingProgress(true);
  setError(null);
  try {
    const result = await getInspectionProgress();
    setProgress(result);
    setActiveDomainId((prev) => prev ?? result.domains[0]?.domain_id ?? null);
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Failed to load inspection.");
  } finally {
    if (showFullLoader) setLoadingProgress(false);
  }
}, []);

  useEffect(() => {
    if (accessToken) fetchProgress();
  }, [accessToken, fetchProgress]);

  const fetchQuestions = useCallback(async (domainId: string) => {
    setLoadingQuestions(true);
    setError(null);
    try {
      const result = await getInspectionDomainQuestions(domainId);
      setQuestions(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load questions.");
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (activeDomainId && progress?.inspection_status === "in_progress") {
      fetchQuestions(activeDomainId);
    }
  }, [activeDomainId, progress?.inspection_status, fetchQuestions]);

  async function handleAnswer(questionId: string, value: "Yes" | "No" | "N/A") {
    const prev = questions;
    setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, value } : q)));
    try {
      await upsertAnswer(questionId, value);
      await fetchProgress(false);
    } catch (err) {
      setQuestions(prev);
      setError(err instanceof ApiError ? err.message : "Failed to save answer.");
    }
  }

  async function handleFileUpload(questionId: string, file: File) {
    setUploadingId(questionId);
    setError(null);
    try {
      const result = await uploadProofFile(questionId, file);
      setQuestions((qs) =>
        qs.map((q) => (q.id === questionId ? { ...q, proof_files: result.proof_files } : q))
      );
      await fetchProgress(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitInspection();
      router.push(`/dashboard?submitted=1&status=${result.overall_status}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit — some questions may still be incomplete.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen() {
    setReopening(true);
    setError(null);
    try {
      await reopenInspection();
      await fetchProgress();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reopen inspection.");
    } finally {
      setReopening(false);
    }
  }

  if (!isInitialized || !accessToken) return null;
  if (loadingProgress || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  const topBar = (
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
      <div className="flex items-center gap-3">
        {role === "admin" && (
          <a href="/users" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            Admin panel
          </a>
        )}
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Log out
        </button>
      </div>
    </header>
  );

  // ---- SUBMITTED / READ-ONLY VIEW (closes gap 16.6.3) ----
  if (progress.inspection_status === "submitted") {
    const passed = progress.overall_status === "passed";
    return (
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
        {topBar}
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div
            className="rounded-2xl border p-8 text-center shadow-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
          >
            <p
              className="mb-2 inline-block rounded-full px-4 py-1 text-sm font-semibold"
              style={{
                backgroundColor: passed ? "var(--success-soft-bg)" : "var(--critical-bg)",
                color: passed ? "var(--success)" : "var(--critical-text)",
              }}
            >
              {passed ? "Passed" : "Failed"}
            </p>
            <h1 className="font-display mb-4 text-2xl" style={{ color: "var(--text)" }}>
              Inspection submitted
            </h1>

            <div className="mb-6 flex flex-col gap-2 text-left">
              {progress.domains.map((d) => (
                <div
                  key={d.domain_id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ color: "var(--text)" }}>{d.title}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: d.domain_status === "failed" ? "var(--critical-bg)" : "var(--success-soft-bg)",
                      color: d.domain_status === "failed" ? "var(--critical-text)" : "var(--success)",
                    }}
                  >
                    {d.domain_status === "failed" ? "Failed" : "Passed"} — {d.score_percent}% (needs {d.passing_criteria_percent}%)
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleReopen}
              disabled={reopening}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--dark)" }}
            >
              {reopening ? "Reopening…" : "Reopen inspection"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- ANSWERING VIEW ----
  const activeDomain = progress.domains.find((d) => d.domain_id === activeDomainId);
  const activeIndex = progress.domains.findIndex((d) => d.domain_id === activeDomainId);
  const nextDomain = progress.domains[activeIndex + 1];
  const hasCriticalFail = progress.domains.some((d) => d.domain_status === "failed");
  const totalRemaining = progress.domains.reduce((sum, d) => sum + (d.total_count - d.answered_count), 0);
  const currentDomainComplete = activeDomain ? activeDomain.answered_count === activeDomain.total_count : false;
  const targetToPass = activeDomain ? Math.round((activeDomain.total_count * activeDomain.passing_criteria_percent) / 100) : 0;

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "88px" }}>
      {topBar}

      {hasCriticalFail && (
        <div className="px-6 py-3 text-center text-sm font-medium" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
          One or more critical questions were answered "No" — this inspection will fail unless corrected.
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {progress.domains.map((d) => {
            const active = d.domain_id === activeDomainId;
            const failed = d.domain_status === "failed";
            return (
              <button
                key={d.domain_id}
                onClick={() => setActiveDomainId(d.domain_id)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: failed ? "var(--critical-text)" : active ? "var(--primary)" : "var(--border)",
                  backgroundColor: failed ? "var(--critical-bg)" : active ? "var(--primary-soft-bg)" : "var(--surface)",
                  color: failed ? "var(--critical-text)" : active ? "var(--primary-soft-text)" : "var(--text-muted)",
                }}
              >
                {d.title} {d.answered_count}/{d.total_count}
              </button>
            );
          })}
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: "var(--dark)",
              width: `${
                progress.domains.reduce((s, d) => s + d.total_count, 0) === 0
                  ? 0
                  : (progress.domains.reduce((s, d) => s + d.answered_count, 0) /
                      progress.domains.reduce((s, d) => s + d.total_count, 0)) *
                    100
              }%`,
            }}
          />
        </div>

        {activeDomain && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
                {activeDomain.title}
              </h1>
            </div>
            <span
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: "var(--primary-soft-bg)", color: "var(--primary-soft-text)" }}
            >
              You need {targetToPass} of {activeDomain.total_count} met to pass {activeDomain.title} — that is {activeDomain.passing_criteria_percent}%
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
            {error}
          </div>
        )}

        {loadingQuestions ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  borderLeft: q.is_critical ? "4px solid var(--critical-text)" : "1px solid var(--border)",
                }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {q.reference_code && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--primary-soft-bg)", color: "var(--primary-soft-text)" }}>
                      {q.reference_code}
                    </span>
                  )}
                  <span className="font-medium" style={{ color: "var(--text)" }}>{q.title}</span>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {q.regulation_tag && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }}>
                      {q.regulation_tag}
                    </span>
                  )}
                  {q.is_critical && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}>
                      Critical — a no fails this key question outright
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {(["Yes", "No", "N/A"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q.id, opt)}
                      className="rounded-lg border px-4 py-2 text-sm font-medium"
                      style={{
                        borderColor: q.value === opt ? "var(--dark)" : "var(--border)",
                        backgroundColor: q.value === opt ? "var(--dark)" : "var(--surface)",
                        color: q.value === opt ? "#ffffff" : "var(--text)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setExpandedEvidence(expandedEvidence === q.id ? null : q.id)}
                  className="mt-3 text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  {expandedEvidence === q.id ? "▾" : "▸"} Evidence you need to show
                </button>

                {expandedEvidence === q.id && (
                  <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--tag-bg)" }}>
                    {q.proof_required ? (
                      <>
                        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
                          Upload a photo or document as evidence for this question.
                        </p>
                        {q.proof_files.length > 0 && (
                          <ul className="mb-2 flex flex-col gap-1">
                            {q.proof_files.map((pf, i) => (
                              <li key={i} className="text-xs" style={{ color: "var(--text)" }}>
                                📎 {pf.filename}
                              </li>
                            ))}
                          </ul>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={uploadingId === q.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(q.id, file);
                          }}
                          className="text-xs"
                        />
                        {uploadingId === q.id && (
                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Uploading…</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        No evidence upload required for this question.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t px-6 py-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <button
          onClick={() => progress.domains[0] && setActiveDomainId(progress.domains[0].domain_id)}
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Back to start
        </button>

        {nextDomain ? (
          <button
            onClick={() => setActiveDomainId(nextDomain.domain_id)}
            disabled={!currentDomainComplete}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--dark)" }}
          >
            Continue to {nextDomain.title} →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!currentDomainComplete || submitting}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--dark)" }}
          >
            {submitting ? "Submitting…" : "Submit inspection"}
          </button>
        )}

        <div className="flex items-center gap-4">
          {totalRemaining > 0 && (
            <span className="text-sm font-medium" style={{ color: "var(--critical-text)" }}>
              {totalRemaining} still to complete
            </span>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Save and exit
          </button>
        </div>
      </div>
    </div>
  );
}