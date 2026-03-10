/** Protects app routes with Auth.js before route handling. */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (process.env.SKIP_AUTH === "true") {
    return NextResponse.next();
  }
  if (!req.auth && !req.nextUrl.pathname.startsWith("/sign-in") && !req.nextUrl.pathname.startsWith("/api/auth")) {
    const newUrl = new URL("/sign-in", req.nextUrl.origin);
    return NextResponse.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
