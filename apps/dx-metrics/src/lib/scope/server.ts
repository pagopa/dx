/**
 * Request-side scope handling: reading the cookie, verifying the token, and
 * turning a missing or invalid scope into an HTTP response.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  fullPortfolioScope,
  resolveScope,
  type Scope,
} from "@/lib/scope/scope";
import { verifyScopeToken } from "@/lib/scope/token";

/** Cookie carrying the signed token after a magic link has been opened. */
export const SCOPE_COOKIE_NAME = "dx_metrics_scope";

/**
 * A visitor keeps their scope for a week, then has to open the link again. The
 * link itself does not expire; only the browser's copy of it does.
 */
export const SCOPE_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Emergency switch: setting it to `false` serves the full portfolio to any
 * request without a valid scope, so access can be restored without a redeploy
 * if the mechanism misbehaves. It is not a rollout tool, and the default
 * enforces: a missing variable must close the portal, not open it.
 */
const ENFORCEMENT_DISABLED = "false";

let cachedScopeSecret: null | string = null;

/**
 * The signing secret, read once per process. It is the highest-value secret the
 * portal holds: whoever has it can mint a link for any scope. Length is checked
 * by the token functions that actually use it.
 */
export const getScopeSecret = (): string => {
  if (cachedScopeSecret !== null) {
    return cachedScopeSecret;
  }

  const secret = process.env.DX_METRICS_SCOPE_SECRET ?? "";
  if (secret.length === 0) {
    throw new Error("DX_METRICS_SCOPE_SECRET is not set");
  }

  cachedScopeSecret = secret;
  return cachedScopeSecret;
};

/**
 * Resolves a raw cookie value to the scope it carries, without any rollout
 * fallback. The magic-link entry point uses this directly: a link that does not
 * verify must never be accepted, whatever the rollout switch says.
 */
export const resolveScopeFromToken = (
  token: string | undefined,
): null | Scope => {
  if (token === undefined || token.length === 0) {
    return null;
  }

  const payload = verifyScopeToken(token, getScopeSecret());
  return payload === null ? null : resolveScope(payload);
};

export const isScopeEnforced = (): boolean =>
  process.env.DX_METRICS_SCOPE_ENFORCE !== ENFORCEMENT_DISABLED;

/**
 * The scope a request is served under. During rollout a request without a valid
 * cookie falls back to the full portfolio even though no link was opened.
 */
export const resolveActiveScope = (token: string | undefined): null | Scope =>
  resolveScopeFromToken(token) ??
  (isScopeEnforced() ? null : fullPortfolioScope());

const noStore = { headers: { "Cache-Control": "no-store" } };

/**
 * Guards a route handler. Every data endpoint resolves its scope through this
 * function: the requested repositories are never trusted on their own.
 */
export const requireScope = (
  req: NextRequest,
): { error: NextResponse } | { scope: Scope } => {
  const scope = resolveActiveScope(req.cookies.get(SCOPE_COOKIE_NAME)?.value);
  return scope === null
    ? {
        error: NextResponse.json(
          { error: "A valid scope link is required" },
          { ...noStore, status: 401 },
        ),
      }
    : { scope };
};

/**
 * Guards a surface that only makes sense for the whole portfolio, such as the
 * DX Team dashboard. A narrowed scope gets a refusal rather than a filtered
 * version of a view that is org-wide by construction.
 */
export const requireFullScope = (
  req: NextRequest,
): { error: NextResponse } | { scope: Scope } => {
  const auth = requireScope(req);
  if ("error" in auth) {
    return auth;
  }

  return auth.scope.all
    ? auth
    : {
        error: NextResponse.json(
          { error: "Not available for this scope" },
          { ...noStore, status: 403 },
        ),
      };
};
