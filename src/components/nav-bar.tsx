"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";

const adminLinks = [
  { href: "/dashboard", label: "לוח בקרה" },
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/organizations", label: "ארגונים" },
  { href: "/admin/card-types", label: "סוגי כרטיסים" },
  { href: "/admin/reports", label: "דוחות" },
  { href: "/admin/settings", label: "הגדרות" },
];

const requesterLinks = [
  { href: "/dashboard", label: "לוח בקרה" },
  { href: "/orders", label: "ההזמנות שלי" },
  { href: "/orders/new", label: "הזמנה חדשה" },
];

const signatoryLinks = [
  { href: "/dashboard", label: "לוח בקרה" },
  { href: "/orders", label: "הזמנות" },
];

function getLinks(role: UserRole) {
  if (role === "admin") return adminLinks;
  if (role === "signatory") return signatoryLinks;
  return requesterLinks;
}

export default function NavBar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const links = getLinks(role);

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center ml-4">
          <span className="text-white text-sm font-bold">מ</span>
        </div>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        יציאה
      </button>
    </nav>
  );
}
