import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/", "/login", "/signup", "/terms", "/privacy"];
const authRoutes = ["/login", "/signup"];
// All route prefixes that require authentication (mirrors app/(dashboard)/ structure)
const protectedPrefixes = [
  "/dashboard",
  "/applications",
  "/analytics",
  "/profile",
  "/jobs",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);
  const isDashboardRoute = protectedPrefixes.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );
  const isApiRoute = pathname.startsWith("/api");
  const isAuthApiRoute = pathname.startsWith("/api/auth");

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  if (isAuthApiRoute) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    if (token?.userId) {
      response.headers.set("x-user-id", token.userId as string);
    }
    return response;
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isDashboardRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev; tighten post-launch
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.amazonaws.com https://images.unsplash.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: [
    // Protected app routes
    "/dashboard",
    "/dashboard/:path*",
    "/applications",
    "/applications/:path*",
    "/analytics",
    "/analytics/:path*",
    "/profile",
    "/profile/:path*",
    "/jobs",
    "/jobs/:path*",
    // API routes (all protected except /api/auth/*)
    "/api/:path*",
    // Auth page routes (redirect to dashboard if already logged in)
    "/login",
    "/signup",
  ],
};
