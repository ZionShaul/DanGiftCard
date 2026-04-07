import { requireAdmin } from "@/lib/auth/helpers";
import NavBar from "@/components/nav-bar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar role="admin" userName={user.name} />
      <main>{children}</main>
    </div>
  );
}
