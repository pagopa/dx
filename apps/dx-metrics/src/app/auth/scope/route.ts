/**
 * Magic-link entry point.
 *
 * Verifies the token, stores it in an httpOnly cookie and sends the visitor on
 * to the overview. The token never stays in the address bar: the redirect drops
 * it, so it does not survive in history, bookmarks or a copied URL.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  resolveScopeFromToken,
  SCOPE_COOKIE_MAX_AGE_SECONDS,
  SCOPE_COOKIE_NAME,
} from "@/lib/scope/server";

// Route handlers are not cached by default, so this response is evaluated per
// request without asking for it.

const ACCESS_PAGE = "/access";
const DASHBOARDS_PAGE = "/dashboards/overview";

/**
 * Builds the absolute redirect target from the request headers.
 *
 * `req.nextUrl.origin` is not usable here: the standalone server is started with
 * `HOSTNAME=0.0.0.0`, so it describes the container's own address rather than
 * the host the visitor typed. The `Host` header is the one the proxy forwarded.
 */
const requestOrigin = (req: NextRequest): string => {
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwarded === undefined || forwarded.length === 0
      ? req.nextUrl.protocol.replace(":", "")
      : forwarded;

  return `${protocol}://${host}`;
};

const redirect = (req: NextRequest, pathname: string): NextResponse => {
  const response = NextResponse.redirect(
    new URL(pathname, requestOrigin(req)),
    303,
  );
  // The token travels in the URL on this request only: never let it leak as a
  // referrer, and never let a proxy cache a response that sets a credential.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};

export function GET(req: NextRequest): NextResponse {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  // A payload naming a tag nobody carries resolves to null: the tag was removed
  // from the configuration, which revokes the link. A link that does not verify
  // is never accepted, regardless of the rollout switch.
  if (resolveScopeFromToken(token) === null) {
    return redirect(req, `${ACCESS_PAGE}?invalid=1`);
  }

  const response = redirect(req, DASHBOARDS_PAGE);
  response.cookies.set(SCOPE_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SCOPE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
