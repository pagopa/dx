import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import type { Config } from "../../../config.js";
import type { Dependencies } from "../../../domain/dependencies.js";

import { type CliDependencies, makeCli } from "../index.js";

const makeProgram = (argv: string[]): Command => {
  const program = makeCli(
    mock<Dependencies>(),
    mock<Config>(),
    mock<CliDependencies>(),
    "0.0.0",
  );
  program.exitOverride().configureOutput({
    writeErr: () => {
      /* silence stderr in tests */
    },
    writeOut: () => {
      /* silence stdout in tests */
    },
  });
  program.parseOptions(argv);
  return program;
};

describe("--output option", () => {
  it("defaults to 'text' when not provided", () => {
    const program = makeProgram([]);
    expect(program.opts().output).toBe("text");
  });

  it("accepts 'text' explicitly", () => {
    const program = makeProgram(["--output", "text"]);
    expect(program.opts().output).toBe("text");
  });

  it("accepts 'json'", () => {
    const program = makeProgram(["--output", "json"]);
    expect(program.opts().output).toBe("json");
  });

  it("rejects invalid values", () => {
    expect(() => makeProgram(["--output", "xml"])).toThrow();
  });
});
