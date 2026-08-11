export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ backgroundColor: "var(--ink)" }}
    >
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-6 top-1/2 hidden -translate-y-1/2 select-none text-[14vw] leading-none opacity-[0.04] md:block"
        style={{ color: "var(--paper)" }}
      >
        FIELD LOG
      </span>
      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        <div className="font-display text-sm" style={{ color: "var(--muted)" }}>
          INSPECTION APP
        </div>
        {children}
      </div>
    </div>
  );
}