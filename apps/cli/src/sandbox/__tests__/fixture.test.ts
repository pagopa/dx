import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { loadFixture } from "../fixture.js";
import { createEmptySandboxState } from "../state.js";

describe("loadFixture", () => {
  it("returns empty state when no path is provided", async () => {
    const state = await loadFixture();
    expect(state).toEqual(createEmptySandboxState());
  });

  it("loads cloud accounts and repositories from a fixture file", async () => {
    const fixturePath = path.join(
      import.meta.dirname,
      "../fixtures/default.json",
    );
    const state = await loadFixture(fixturePath);

    expect(state.cloudAccounts).toHaveLength(2);
    expect(state.cloudAccounts[0].displayName).toBe("DEV-MyProject");
    expect(state.cloudAccounts[1].displayName).toBe("PROD-MyProject");
    expect(state.repositories).toHaveLength(1);
    expect(state.repositories[0].name).toBe("pagopa-github-terraform");
    expect(state.operationLog).toHaveLength(0);
  });
});
