import { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="w-full max-w-md rounded-2xl border p-8 shadow-sm"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="mb-6 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa, #34d399)" }}
        >
          M
        </div>
        <span className="font-display text-lg" style={{ color: "var(--text)" }}>
          Mock Inspection
        </span>
      </div>

      <h1 className="font-display mb-1 text-xl" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}

      {children}

      {footer && (
        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {footer}
        </p>
      )}
    </div>
  );
}