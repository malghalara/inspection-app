import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
      <AdminTopBar />
      {children}
    </div>
  );
}