import { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="relative w-full max-w-md rounded-sm border"
      style={{ borderColor: "var(--panel-border)", backgroundColor: "var(--panel)" }}
    >
      <div
        className="absolute -top-3 left-6 h-6 w-6 rounded-full border-4"
        style={{ backgroundColor: "var(--ink)", borderColor: "var(--panel-border)" }}
      />
      <div className="px-8 pt-8 pb-6">
        <p className="font-display text-xs mb-1" style={{ color: "var(--tag-amber)" }}>
          {eyebrow}
        </p>
        <h1 className="font-display text-2xl" style={{ color: "var(--paper)" }}>
          {title}
        </h1>
      </div>
      <div className="mx-8 border-t border-dashed" style={{ borderColor: "var(--panel-border)" }} />
      <div className="px-8 py-6">{children}</div>
      {footer && (
        <div className="px-8 pb-8 pt-2 text-sm" style={{ color: "var(--muted)" }}>
          {footer}
        </div>
      )}
    </div>
  );
}