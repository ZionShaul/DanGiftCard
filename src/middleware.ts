import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Debug logging
  if (pathname === "/dashboard" || pathname.startsWith("/api/auth/callback")) {
    console.error("[middleware] path:", pathname, "session:", session ? `user=${session.user?.email}` : "null");
  }

  // Public routes
  const publicRoutes = ["/login", "/approval"];
  if (publicRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname.startsWith("/api/approval")) return NextResponse.next();

  // Require authentication
  if (!session) {
    if (pathname === "/dashboard") {
      console.error("[middleware] no session → redirecting /dashboard to /login");
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
