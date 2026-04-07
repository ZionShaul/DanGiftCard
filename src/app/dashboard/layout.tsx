import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import NavBar from "@/components/nav-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const org = user.organizationId
    ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } })
    : null;
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar role={user.role} userName={user.name} orgName={org?.name} />
      <main>{children}</main>
    </div>
  );
}
