"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/users", label: "Users" },
  { href: "/domains", label: "Domains" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex gap-2">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border px-4 py-2 text-sm font-medium transition"
            style={{
              borderColor: active ? "var(--primary)" : "var(--border)",
              backgroundColor: active ? "var(--primary-soft-bg)" : "var(--surface)",
              color: active ? "var(--primary-soft-text)" : "var(--text-muted)",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}