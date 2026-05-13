/**
 * Characterization test for the dx init publish workflow.
 * It freezes the local command-flow behavior with real CLI tools and local emulators.
 */

import { expect, test } from "vitest";

import { runCharacterizationScenario } from "./support/scenarios.js";

test("freezes dx init publish against local git and GitHub emulators", async () => {
  await expect(
    runCharacterizationScenario("dx-init-publish"),
  ).resolves.toBeUndefined();
}, 300_000);
