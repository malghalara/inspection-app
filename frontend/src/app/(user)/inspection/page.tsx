"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  DomainProgress,
  QuestionWithAnswer,
  getInspectionProgress,
  getInspectionDomainQuestions,
  upsertAnswer,
  submitInspection,
} from "@/lib/api";

export default function InspectionPage() {
  const { isInitialized, accessToken, role, logout } = useAuth();
  const router = useRouter();

  const [domains, setDomains] = useState<DomainProgress[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!accessToken) {
      router.replace("/login");
    }
  }, [isInitialized, accessToken, router]);

  const loadProgress = useCallback(async () => {
    setLoadingDomains(true);
    setError(null);
    try {
      const progress = await getInspectionProgress();
      setDomains(progress.domains);
      setSelectedDomainId((prev) => prev ?? progress.domains[0]?.domain_id ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load inspection progress");
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) loadProgress();
  }, [accessToken, loadProgress]);

  const loadQuestions = useCallback(async (domainId: string) => {
    setLoadingQuestions(true);
    setError(null);
    try {
      const qs = await getInspectionDomainQuestions(domainId);
      setQuestions(qs);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDomainId) loadQuestions(selectedDomainId);
  }, [selectedDomainId, loadQuestions]);

  const currentDomain = useMemo(
    () => domains.find((d) => d.domain_id === selectedDomainId) ?? null,
    [domains, selectedDomainId]
  );

  const currentDomainIndex = useMemo(
    () => domains.findIndex((d) => d.domain_id === selectedDomainId),
    [domains, selectedDomainId]
  );

  const nextDomain = domains[currentDomainIndex + 1];

  const overallProgressPercent = useMemo(() => {
    const total = domains.reduce((sum, d) => sum + d.total_count, 0);
    const answered = domains.reduce((sum, d) => sum + d.answered_count, 0);
    return total === 0 ? 0 : Math.round((answered / total) * 100);
  }, [domains]);

  async function handleAnswer(question: QuestionWithAnswer, value: "Yes" | "No" | "N/A") {
    setError(null);
    const prevQuestions = questions;
    const prevDomains = domains;

    // optimistic update
    setQuestions((qs) => qs.map((q) => (q.id === question.id ? { ...q, value } : q)));
    setDomains((ds) =>
      ds.map((d) => {
        if (d.domain_id !== question.domain_id) return d;
        const wasAnswered = question.value !== null;
        return wasAnswered ? d : { ...d, answered_count: d.answered_count + 1 };
      })
    );

    try {
      await upsertAnswer(question.id, value);
      if (selectedDomainId) await loadProgress();
    } catch (err: any) {
      setQuestions(prevQuestions);
      setDomains(prevDomains);
      setError(err?.message ?? "Failed to save answer");
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitInspection();
      router.push(`/dashboard?submitted=1&status=${result.overall_status}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isInitialized || !accessToken) return null;

  const passThreshold = currentDomain
    ? Math.round((currentDomain.total_count * currentDomain.passing_criteria_percent) / 100)
    : 0;
  const remaining = currentDomain ? currentDomain.total_count - currentDomain.answered_count : 0;
  const canContinue = currentDomain ? remaining === 0 : false;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top navbar */}
      <div className="border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
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
            <button
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Refer a friend
            </button>
            <button
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Dental ▾
            </button>
            <button
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              🔍
            </button>
            <button
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              🔔
            </button>
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--dark)" }}
              >
                {role === "admin" ? "A" : "U"}
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 rounded-lg border py-1 shadow-sm"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                >
                  {role === "admin" && (
                    <button
                      onClick={() => router.push("/domains")}
                      className="block w-full px-3 py-2 text-left text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      Admin panel
                    </button>
                  )}
                  <button
                    onClick={() => logout?.()}
                    className="block w-full px-3 py-2 text-left text-sm"
                    style={{ color: "var(--critical-text)" }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="mx-auto max-w-5xl px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <button
                key={d.domain_id}
                onClick={() => setSelectedDomainId(d.domain_id)}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition"
                style={
                  d.domain_id === selectedDomainId
                    ? { backgroundColor: "var(--primary)", color: "#fff" }
                    : { backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }
                }
              >
                {d.title} ({d.answered_count}/{d.total_count})
              </button>
            ))}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${overallProgressPercent}%`, backgroundColor: "var(--primary)" }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}
          >
            {error}
          </div>
        )}

        {/* Section header + banner */}
        {currentDomain && (
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
                {currentDomain.title}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Are people protected from abuse and avoidable harm?
              </p>
            </div>
            <div
              className="rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{ backgroundColor: "var(--primary-soft-bg)", color: "var(--primary-soft-text)" }}
            >
              You need {passThreshold} of {currentDomain.total_count} met to pass {currentDomain.title} — that is{" "}
              {currentDomain.passing_criteria_percent}%
            </div>
          </div>
        )}

        {/* Question cards */}
        {loadingQuestions ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading questions…
          </p>
        ) : questions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No questions in this domain yet.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border p-5 shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  borderLeft: q.is_critical ? "4px solid var(--critical-text)" : undefined,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {q.reference_code && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: "var(--primary-soft-bg)", color: "var(--primary-soft-text)" }}
                    >
                      {q.reference_code}
                    </span>
                  )}
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {q.title}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {q.regulation_tag && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }}
                    >
                      {q.regulation_tag}
                    </span>
                  )}
                  {q.is_critical && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}
                    >
                      Critical — a no fails this key question outright
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {(["Yes", "No", "N/A"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q, opt)}
                      className="rounded-full px-4 py-1.5 text-sm font-medium transition"
                      style={
                        q.value === opt
                          ? { backgroundColor: "var(--primary)", color: "#fff" }
                          : { backgroundColor: "var(--tag-bg)", color: "var(--text)" }
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="mt-4 text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  {expandedId === q.id ? "▼" : "►"} Evidence you need to show
                </button>
                {expandedId === q.id && (
                  <div className="mt-2 rounded-lg p-3 text-xs" style={{ backgroundColor: "var(--tag-bg)", color: "var(--text-muted)" }}>
                    {q.proof_required
                      ? "Evidence upload isn't available yet — file attachment support is coming in a later update. For now, your Yes/No/N/A answer alone is saved."
                      : "No evidence is required for this question."}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t px-6 py-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setSelectedDomainId(domains[0]?.domain_id ?? null)}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Back to start
          </button>

          <div className="flex flex-1 items-center justify-center gap-3">
            {nextDomain ? (
              <button
                disabled={!canContinue}
                onClick={() => setSelectedDomainId(nextDomain.domain_id)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--dark)" }}
              >
                Continue to {nextDomain.title} →
              </button>
            ) : (
              <button
                disabled={!canContinue || submitting}
                onClick={handleSubmit}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--dark)" }}
              >
                {submitting ? "Submitting…" : "Submit inspection"}
              </button>
            )}
            {!canContinue && (
              <span className="text-sm font-medium" style={{ color: "var(--critical-text)" }}>
                {remaining} still to complete before you can continue
              </span>
            )}
          </div>

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