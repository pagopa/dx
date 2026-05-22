/**
 * Tests for the `spec` Commander command.
 *
 * Verifies that `makeSpecCommand` calls the `getSpec` callback and writes the
 * resulting CliSpec as pretty-printed JSON to stdout.
 */

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CliSpec } from "../../../../domain/spec.js";

import { makeSpecCommand } from "../spec.js";

const makeMinimalSpec = (): CliSpec => ({
  commands: [],
  description: "The CLI for DX-Platform",
  globalOptions: [],
  name: "dx",
  specVersion: "1",
  version: "0.0.0",
});

describe("makeSpecCommand", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("is registered as the 'spec' subcommand", () => {
    const cmd = makeSpecCommand(() => makeMinimalSpec());
    expect(cmd.name()).toBe("spec");
  });

  it("calls getSpec and writes JSON to stdout when invoked", async () => {
    const spec = makeMinimalSpec();
    const getSpec = vi.fn().mockReturnValue(spec);
    const cmd = makeSpecCommand(getSpec);

    // Parse with an isolated parent so Commander doesn't exit
    const root = new Command().exitOverride().addCommand(cmd);
    root.configureOutput({
      writeErr: () => {
        /* silence */
      },
      writeOut: () => {
        /* silence */
      },
    });

    await root.parseAsync(["spec"], { from: "user" });

    expect(getSpec).toHaveBeenCalledOnce();
    const written = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(JSON.parse(written)).toEqual(spec);
  });

  it("outputs valid pretty-printed JSON (indented)", async () => {
    const spec = makeMinimalSpec();
    const cmd = makeSpecCommand(() => spec);

    const root = new Command().exitOverride().addCommand(cmd);
    root.configureOutput({
      writeErr: () => {
        /* silence */
      },
      writeOut: () => {
        /* silence */
      },
    });

    await root.parseAsync(["spec"], { from: "user" });

    const written = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    // Pretty-printed JSON has newlines
    expect(written).toContain("\n");
    expect(written).toContain("  ");
  });

  it("includes specVersion '1' in the output", async () => {
    const cmd = makeSpecCommand(() => makeMinimalSpec());

    const root = new Command().exitOverride().addCommand(cmd);
    root.configureOutput({
      writeErr: () => {
        /* silence */
      },
      writeOut: () => {
        /* silence */
      },
    });

    await root.parseAsync(["spec"], { from: "user" });

    const written = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(written) as CliSpec;
    expect(parsed.specVersion).toBe("1");
  });
});
