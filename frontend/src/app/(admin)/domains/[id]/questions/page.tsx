"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Question,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  Domain,
  listDomains,
} from "@/lib/api";
import { AdminNav } from "@/components/admin/AdminNav";

export default function DomainQuestionsPage() {
  const { id: domainId } = useParams<{ id: string }>();
  const router = useRouter();
  const { isInitialized, accessToken, role } = useAuth();

  const [domain, setDomain] = useState<Domain | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [proofRequired, setProofRequired] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [regulationTag, setRegulationTag] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIsCritical, setEditIsCritical] = useState(false);
  const [editProofRequired, setEditProofRequired] = useState(false);
  const [editReferenceCode, setEditReferenceCode] = useState("");
  const [editRegulationTag, setEditRegulationTag] = useState("");

  useEffect(() => {
    if (!isInitialized) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [isInitialized, accessToken, role, router]);

  const load = useCallback(async () => {
    if (!domainId) return;
    setLoading(true);
    setError(null);
    try {
      const [domains, qs] = await Promise.all([listDomains(), listQuestions(domainId)]);
      const d = domains.find((x) => x.id === domainId) ?? null;
      setDomain(d);
      setQuestions(qs);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => {
    if (!isInitialized || !accessToken || role !== "admin") return;
    load();
  }, [isInitialized, accessToken, role, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createQuestion({
        title,
        domain_id: domainId,
        is_critical: isCritical,
        proof_required: proofRequired,
        reference_code: referenceCode || undefined,
        regulation_tag: regulationTag || undefined,
      });
      setTitle("");
      setIsCritical(false);
      setProofRequired(false);
      setReferenceCode("");
      setRegulationTag("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create question");
    }
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditTitle(q.title);
    setEditIsCritical(q.is_critical);
    setEditProofRequired(q.proof_required);
    setEditReferenceCode(q.reference_code ?? "");
    setEditRegulationTag(q.regulation_tag ?? "");
  }

  async function handleSaveEdit(id: string) {
    setError(null);
    try {
      await updateQuestion(id, {
        title: editTitle,
        is_critical: editIsCritical,
        proof_required: editProofRequired,
        reference_code: editReferenceCode,
        regulation_tag: editRegulationTag,
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update question");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const prev = questions;
    setQuestions(questions.filter((q) => q.id !== id));
    try {
      await deleteQuestion(id);
    } catch (err: any) {
      setQuestions(prev);
      setError(err?.message ?? "Failed to delete question");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const prev = questions;
    setQuestions(reordered);

    try {
      await reorderQuestions(reordered.map((q) => q.id));
      await load();
    } catch (err: any) {
      setQuestions(prev);
      setError(err?.message ?? "Failed to reorder questions");
    }
  }

  if (!isInitialized || !accessToken || role !== "admin") return null;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <AdminNav />

        <div className="mb-8">
          <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
            Domain
          </p>
          <h1 className="font-display mt-1 text-2xl" style={{ color: "var(--text)" }}>
            {domain ? domain.title : "…"} — Questions
          </h1>
          {domain && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Passing criteria: {domain.passing_criteria_percent}%
            </p>
          )}
        </div>

        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical-text)" }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-4 rounded-2xl border p-5 shadow-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Add Question
          </h2>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            placeholder="Question title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-4">
            <input
              className="min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              placeholder="Reference code (e.g. DEN-S-01)"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
            />
            <input
              className="min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              placeholder="Regulation tag (e.g. Reg 13)"
              value={regulationTag}
              onChange={(e) => setRegulationTag(e.target.value)}
            />
          </div>
          <div className="flex gap-6 text-sm" style={{ color: "var(--text)" }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} />
              Critical (failing = automatic domain fail)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={proofRequired} onChange={(e) => setProofRequired(e.target.checked)} />
              Proof required
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--dark)" }}
          >
            Add Question
          </button>
        </form>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : questions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No questions yet for this domain.</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  borderLeft: q.is_critical ? "4px solid var(--critical-text)" : "1px solid var(--border)",
                }}
              >
                {editingId === q.id ? (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-4">
                      <input
                        className="min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        value={editReferenceCode}
                        onChange={(e) => setEditReferenceCode(e.target.value)}
                        placeholder="Reference code"
                      />
                      <input
                        className="min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        value={editRegulationTag}
                        onChange={(e) => setEditRegulationTag(e.target.value)}
                        placeholder="Regulation tag"
                      />
                    </div>
                    <div className="flex gap-6 text-sm" style={{ color: "var(--text)" }}>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editIsCritical} onChange={(e) => setEditIsCritical(e.target.checked)} />
                        Critical
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editProofRequired} onChange={(e) => setEditProofRequired(e.target.checked)} />
                        Proof required
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(q.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: "var(--dark)" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {q.reference_code && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: "var(--primary-soft-bg)", color: "var(--primary-soft-text)" }}
                          >
                            {q.reference_code}
                          </span>
                        )}
                        <span className="font-medium" style={{ color: "var(--text)" }}>
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
                        {q.proof_required && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: "var(--tag-bg)", color: "var(--tag-text)" }}
                          >
                            Proof required
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          #{q.order}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-30"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMove(index, 1)}
                        disabled={index === questions.length - 1}
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-30"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="rounded-md border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="rounded-md border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: "var(--critical-text)", color: "var(--critical-text)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}