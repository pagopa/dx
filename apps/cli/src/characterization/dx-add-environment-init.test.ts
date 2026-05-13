/**
 * Characterization test for the dx add environment init workflow.
 * It freezes the local command-flow behavior with local Azure and GitHub emulators.
 */

import { expect, test } from "vitest";

import { runCharacterizationScenario } from "./support/scenarios.js";

test("freezes dx add environment init against local Azure and GitHub emulators", async () => {
  await expect(
    runCharacterizationScenario("dx-add-environment-init"),
  ).resolves.toBeUndefined();
}, 180_000);
