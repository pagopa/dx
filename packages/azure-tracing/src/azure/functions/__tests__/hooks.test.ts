/**
 * Tests for registerAzureFunctionHooks.
 *
 * Includes a compile-time type compatibility check: the real `app` object from
 * `@azure/functions` is assigned to the parameter type of `registerAzureFunctionHooks`.
 * If upstream ever breaks our structural interface, TypeScript will catch it here.
 */
import { app } from "@azure/functions";
import { describe, expect, it } from "vitest";

import { registerAzureFunctionHooks } from "../hooks.js";

describe("registerAzureFunctionHooks", () => {
  it("accepts the real @azure/functions app object", () => {
    // Compile-time assertion: if the structural AzureFunctionsApp interface
    // ever becomes incompatible with the real `app`, this line will fail to
    // typecheck before the test suite even runs.
    const compatible: Parameters<typeof registerAzureFunctionHooks>[0] = app;
    expect(compatible).toBeDefined();
  });
});
