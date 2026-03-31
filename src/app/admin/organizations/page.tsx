import { requireAdmin } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function OrganizationsPage() {
  await requireAdmin();

  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, orders: true } },
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ניהול ארגונים</h1>
        <Link
          href="/admin/organizations/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + ארגון חדש
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">קוד</th>
              <th className="text-right px-4 py-3 font-medium">מייל קשר</th>
              <th className="text-center px-4 py-3 font-medium">משתמשים</th>
              <th className="text-center px-4 py-3 font-medium">הזמנות</th>
              <th className="text-center px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{org.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{org.code ?? "–"}</td>
                <td className="px-4 py-3 text-slate-500">{org.contactEmail ?? "–"}</td>
                <td className="px-4 py-3 text-center">{org._count.users}</td>
                <td className="px-4 py-3 text-center">{org._count.orders}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      org.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {org.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    עריכה
                  </Link>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  אין ארגונים. הוסף ארגון ראשון.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{orgs.length} ארגונים רשומים</p>
    </div>
  );
}
