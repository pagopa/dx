import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  SCOPE_COOKIE_MAX_AGE_SECONDS,
  SCOPE_COOKIE_NAME,
} from "@/lib/scope/server";
import { signScopeToken } from "@/lib/scope/token";

import { GET } from "./route.js";

const SECRET = "test-secret-0123456789abcdef012345";

const request = (token?: string): NextRequest => {
  const url = new URL("http://localhost/auth/scope");
  if (token !== undefined) {
    url.searchParams.set("token", token);
  }
  return new NextRequest(url.toString());
};

const tagToken = (tags: string[]): string =>
  signScopeToken({ tags, v: 1 }, SECRET);

beforeAll(() => {
  vi.stubEnv("DX_METRICS_SCOPE_SECRET", SECRET);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("GET /auth/scope", () => {
  it("stores the token in a cookie and redirects to the overview", () => {
    const token = tagToken(["p4pa"]);
    const response = GET(request(token));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/\/dashboards\/overview$/);
    expect(cookie).toContain(`${SCOPE_COOKIE_NAME}=${token}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${SCOPE_COOKIE_MAX_AGE_SECONDS}`);
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  it("never lets the token leak as a referrer and never caches the redirect", () => {
    const response = GET(request(tagToken(["p4pa"])));

    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects to the host the visitor used, not the container hostname", () => {
    const url = new URL("http://internal:3000/auth/scope");
    url.searchParams.set("token", tagToken(["p4pa"]));
    const response = GET(
      new NextRequest(url.toString(), {
        headers: {
          host: "metrics.dx.pagopa.it",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://metrics.dx.pagopa.it/dashboards/overview",
    );
  });

  it("rejects a request without a token", () => {
    const response = GET(request());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/\/access\?invalid=1$/);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a malformed token", () => {
    const response = GET(request("not-a-token"));

    expect(response.headers.get("location")).toMatch(/\/access\?invalid=1$/);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = signScopeToken(
      { tags: ["p4pa"], v: 1 },
      "another-secret-0123456789abcdef01",
    );
    const response = GET(request(token));

    expect(response.headers.get("location")).toMatch(/\/access\?invalid=1$/);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a token whose tag has been removed from the configuration", () => {
    const response = GET(request(tagToken(["gone"])));

    expect(response.headers.get("location")).toMatch(/\/access\?invalid=1$/);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
