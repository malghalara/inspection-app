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
    <nav className="mb-8 flex gap-4 border-b pb-3" style={{ borderColor: "var(--panel-border)" }}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="font-display text-xs tracking-wide"
          style={{
            color: pathname === link.href ? "var(--tag-amber)" : "var(--muted)",
            borderBottom: pathname === link.href ? "2px solid var(--tag-amber)" : "2px solid transparent",
            paddingBottom: "8px",
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}