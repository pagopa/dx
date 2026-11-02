import { dxMetricsConfig } from "@pagopa/dx-metrics-core/config";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { signScopeToken } from "@/lib/scope/token";

import {
  requireFullScope,
  requireScope,
  resolveActiveScope,
  SCOPE_COOKIE_NAME,
} from "../server.js";

const SECRET = "test-secret-0123456789abcdef012345";

const PORTFOLIO = dxMetricsConfig.repositories
  .map((repository) => repository.name)
  .sort((left, right) => left.localeCompare(right));

const token = (payload: Parameters<typeof signScopeToken>[0]): string =>
  signScopeToken(payload, SECRET);

const cookieRequest = (value: string): NextRequest =>
  new NextRequest("http://localhost/api/dashboards/pull-requests", {
    headers: { cookie: `${SCOPE_COOKIE_NAME}=${value}` },
  });

beforeAll(() => {
  vi.stubEnv("DX_METRICS_SCOPE_SECRET", SECRET);
});

afterEach(() => {
  vi.stubEnv("DX_METRICS_SCOPE_ENFORCE", "true");
});

describe("resolveActiveScope", () => {
  it("returns null without a token when enforcement is on", () => {
    expect(resolveActiveScope(undefined)).toBeNull();
  });

  it("falls back to the whole portfolio when enforcement is off", () => {
    vi.stubEnv("DX_METRICS_SCOPE_ENFORCE", "false");

    const scope = resolveActiveScope(undefined);

    expect(scope?.all).toBe(true);
    expect(scope?.repositories).toEqual(PORTFOLIO);
  });

  it("keeps the link scope when enforcement is off", () => {
    vi.stubEnv("DX_METRICS_SCOPE_ENFORCE", "false");

    const scope = resolveActiveScope(token({ tags: ["p4pa"], v: 1 }));

    expect(scope?.tags).toEqual(["p4pa"]);
    expect(scope?.all).toBe(false);
  });

  it("resolves a valid token to its scope", () => {
    const scope = resolveActiveScope(token({ tags: ["pdnd"], v: 1 }));

    expect(scope?.repositories).toEqual([
      "interop-analytics-deployment",
      "interop-be-monorepo",
      "interop-core-deployment",
      "interop-infra-commons",
      "interop-qa-tests",
      "pdnd-interop-frontend",
    ]);
  });

  it("rejects a token signed with another secret", () => {
    const foreign = signScopeToken(
      { tags: ["p4pa"], v: 1 },
      "another-secret-0123456789abcdef01",
    );

    expect(resolveActiveScope(foreign)).toBeNull();
  });

  it("rejects a token whose tag is no longer configured", () => {
    expect(resolveActiveScope(token({ tags: ["gone"], v: 1 }))).toBeNull();
  });
});

describe("requireScope", () => {
  it("returns the scope for a valid cookie", () => {
    const result = requireScope(cookieRequest(token({ tags: ["bb"], v: 1 })));

    expect("scope" in result && result.scope.tags).toEqual(["bb"]);
  });

  it("returns a 401 that no proxy may cache when the cookie is missing", () => {
    const result = requireScope(
      new NextRequest("http://localhost/api/dashboards/pull-requests"),
    );

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
      expect(result.error.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("requireFullScope", () => {
  it("refuses a narrowed scope with a 403", () => {
    const result = requireFullScope(
      cookieRequest(token({ tags: ["p4pa"], v: 1 })),
    );

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
      expect(result.error.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("allows the full-portfolio scope", () => {
    const result = requireFullScope(cookieRequest(token({ all: true, v: 1 })));

    expect("scope" in result && result.scope.all).toBe(true);
  });
});
