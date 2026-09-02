import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Sends signed-out visitors to /login before a page renders.
 *
 * A convenience, not the security boundary: this runs on the Edge runtime and
 * only sees whether a cookie exists, not whether it is valid. requireUser on
 * the server is what actually enforces access.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/register") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
