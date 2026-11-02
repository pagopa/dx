import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardQuery } from "@/lib/query-params";

import { resolveScope, resolveVisibleRepositories } from "../scope.js";

const CONFIGURED = [
  { name: "dx", tags: ["dx"] },
  { name: "p4pa-a", tags: ["p4pa"] },
  { name: "p4pa-b", tags: ["p4pa"] },
  { name: "bb-a", tags: ["bb"] },
] as const;

const scope = resolveScope({ tags: ["p4pa"], v: 1 }, CONFIGURED)!;

const query = (overrides: Partial<DashboardQuery> = {}): DashboardQuery => ({
  days: 120,
  repositories: undefined,
  ...overrides,
});

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("resolveVisibleRepositories", () => {
  it("defaults to the whole scope when no repository is requested", () => {
    expect(resolveVisibleRepositories(query(), scope)).toEqual([
      "p4pa-a",
      "p4pa-b",
    ]);
  });

  it("keeps a requested subset that the scope allows", () => {
    expect(
      resolveVisibleRepositories(query({ repositories: ["p4pa-b"] }), scope),
    ).toEqual(["p4pa-b"]);
  });

  it("drops requested repositories outside the scope", () => {
    expect(
      resolveVisibleRepositories(
        query({ repositories: ["p4pa-a", "dx", "bb-a"] }),
        scope,
      ),
    ).toEqual(["p4pa-a"]);
  });

  it("warns when it drops a requested repository", () => {
    resolveVisibleRepositories(
      query({ repositories: ["p4pa-a", "dx"] }),
      scope,
    );

    expect(warn).toHaveBeenCalledWith(
      "Scope dropped 1 of 2 requested repositories",
    );
  });

  it("stays quiet when the request is entirely visible", () => {
    resolveVisibleRepositories(query({ repositories: ["p4pa-a"] }), scope);

    expect(warn).not.toHaveBeenCalled();
  });

  it("drops a legacy single-repository alias outside the scope", () => {
    expect(
      resolveVisibleRepositories(query({ repository: "dx" }), scope),
    ).toEqual([]);
  });

  it("keeps an explicit empty selection empty", () => {
    expect(
      resolveVisibleRepositories(query({ repositories: [] }), scope),
    ).toEqual([]);
  });
});
