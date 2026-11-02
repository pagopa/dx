/**
 * Signed scope tokens.
 *
 * A magic link carries a payload (a set of tags, or the whole portfolio)
 * followed by an HMAC-SHA256 of that payload. Verification needs only the
 * secret: no session, no database, no expiry. The encoding is deterministic, so
 * the same tag set always yields the same token.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Shortest secret accepted. The secret is the only thing between a reader and
 * any scope, including the full portfolio, so a guessable one defeats the whole
 * mechanism.
 */
export const MIN_SCOPE_SECRET_LENGTH = 32;

/** Bump only together with a change to the payload encoding. */
export const SCOPE_TOKEN_VERSION = 1;

/**
 * Unknown keys are rejected rather than stripped: a payload carrying both
 * `all` and `tags` is ambiguous, and silently picking one would let a signing
 * mistake widen a scope.
 */
const payloadSchema = z.union([
  z
    .object({ all: z.literal(true), v: z.literal(SCOPE_TOKEN_VERSION) })
    .strict(),
  z
    .object({
      tags: z.array(z.string().min(1)).min(1),
      v: z.literal(SCOPE_TOKEN_VERSION),
    })
    .strict(),
]);

/** What a magic link grants: a set of tags, or the whole portfolio. */
export type ScopePayload = z.infer<typeof payloadSchema>;

const assertUsableSecret = (secret: string): void => {
  if (secret.length < MIN_SCOPE_SECRET_LENGTH) {
    throw new Error(
      `Scope secret must be at least ${MIN_SCOPE_SECRET_LENGTH} characters long`,
    );
  }
};

/**
 * Normalises the payload before signing so the same meaning always produces the
 * same token: tags are trimmed, de-duplicated and sorted, and the key order is
 * fixed by construction.
 */
const canonicalPayload = (payload: ScopePayload): unknown =>
  "all" in payload
    ? { all: true, v: SCOPE_TOKEN_VERSION }
    : {
        tags: [...new Set(payload.tags.map((tag) => tag.trim()))]
          .filter((tag) => tag.length > 0)
          .sort(),
        v: SCOPE_TOKEN_VERSION,
      };

const signBody = (body: string, secret: string): string =>
  createHmac("sha256", secret).update(body).digest("base64url");

/** Produces the token for a payload. Throws on an invalid payload or secret. */
export const signScopeToken = (
  payload: ScopePayload,
  secret: string,
): string => {
  assertUsableSecret(secret);

  const parsed = payloadSchema.safeParse(canonicalPayload(payload));
  if (!parsed.success) {
    throw new Error(`Invalid scope payload: ${z.prettifyError(parsed.error)}`);
  }

  const body = Buffer.from(JSON.stringify(parsed.data), "utf8").toString(
    "base64url",
  );
  return `${body}.${signBody(body, secret)}`;
};

/**
 * Returns the payload a token carries, or `null` when the token is malformed,
 * tampered with, or signed with another secret. A misconfigured secret throws
 * instead: every request would fail anyway, and a 500 names the real problem
 * whereas a 401 looks like a broken link.
 */
export const verifyScopeToken = (
  token: string,
  secret: string,
): null | ScopePayload => {
  assertUsableSecret(secret);

  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) {
    return null;
  }

  const body = token.slice(0, separator);
  const expected = Buffer.from(signBody(body, secret), "utf8");
  const provided = Buffer.from(token.slice(separator + 1), "utf8");
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
    const parsed = payloadSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
