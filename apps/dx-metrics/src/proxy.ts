import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Protects app routes with Better Auth before route handling. */
export function proxy(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }
  const sessionCookie = getSessionCookie(req);
  if (
    !sessionCookie &&
    !req.nextUrl.pathname.startsWith("/sign-in") &&
    !req.nextUrl.pathname.startsWith("/api/auth")
  ) {
    const newUrl = new URL("/sign-in", req.nextUrl.origin);
    return NextResponse.redirect(newUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
