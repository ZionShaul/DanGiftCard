import { requireAuth } from "@/lib/auth/helpers";
import NavBar from "@/components/nav-bar";

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar role={user.role} />
      <main>{children}</main>
    </div>
  );
}
