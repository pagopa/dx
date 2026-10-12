/**
 * Retry instructions reproduce public inputs without exposing credentials.
 */
import { describe, expect, it } from "vitest";

import { getPayload } from "../../generators/environment/__tests__/fixtures.js";
import { repositoryStateRetryCommand } from "../prepare-repository-state.js";

describe("repository state retry command", () => {
  it("includes the environment, backend scope and account locations but no private key", () => {
    const payload = getPayload(true);
    const command = repositoryStateRetryCommand(payload);
    expect(command).toContain("--name 'dev'");
    expect(command).toContain("--prefix 'dx'");
    expect(command).toContain("--domain 'mytest'");
    expect(command).toContain("--account 'test-subscription-id'");
    expect(command).toContain("--location 'test-subscription-id=westeurope'");
    expect(command).toContain("--yes");
    expect(command).not.toContain("test-private-key");
  });

  it("quotes free-text tags as literal shell arguments", () => {
    const payload = getPayload();
    payload.tags.Owner = "Team's $(unexpected)";
    expect(repositoryStateRetryCommand(payload)).toContain(
      "--owner 'Team'\\''s $(unexpected)'",
    );
  });
});
