/**
 * Tests for makeCli wiring.
 *
 * Verifies that the parsed CliEnv is forwarded to every command factory so
 * each command can resolve its own presenter (CI vs --output) at action time.
 */
import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { Config } from "../../../config.js";
import type { Dependencies } from "../../../domain/dependencies.js";
import type { CliEnv } from "../env.js";

const commandFactoryMocks = vi.hoisted(() => ({
  makeAddCommand: vi.fn(() => new Command("add")),
  makeCodemodCommand: vi.fn(() => new Command("codemod")),
  makeDoctorCommand: vi.fn(() => new Command("doctor")),
  makeInfoCommand: vi.fn(() => new Command("info")),
  makeInitCommand: vi.fn(() => new Command("init")),
  makeSavemoneyCommand: vi.fn(() => new Command("savemoney")),
}));

vi.mock("../commands/add.js", () => ({
  makeAddCommand: commandFactoryMocks.makeAddCommand,
}));
vi.mock("../commands/codemod.js", () => ({
  makeCodemodCommand: commandFactoryMocks.makeCodemodCommand,
}));
vi.mock("../commands/doctor.js", () => ({
  makeDoctorCommand: commandFactoryMocks.makeDoctorCommand,
}));
vi.mock("../commands/info.js", () => ({
  makeInfoCommand: commandFactoryMocks.makeInfoCommand,
}));
vi.mock("../commands/init.js", () => ({
  makeInitCommand: commandFactoryMocks.makeInitCommand,
}));
vi.mock("../commands/savemoney.js", () => ({
  makeSavemoneyCommand: commandFactoryMocks.makeSavemoneyCommand,
}));

import { type CliDependencies, makeCli } from "../index.js";

describe("makeCli", () => {
  it("forwards the parsed env to each command factory", () => {
    const dependencies = mock<Dependencies>();
    const config = mock<Config>();
    const cliDependencies = mock<CliDependencies>();
    const env: CliEnv = { CI: false };

    makeCli(dependencies, config, cliDependencies, env, "0.0.0");

    expect(commandFactoryMocks.makeDoctorCommand).toHaveBeenCalledWith(
      dependencies,
      config,
      env,
    );
    expect(commandFactoryMocks.makeCodemodCommand).toHaveBeenCalledWith(
      cliDependencies,
      env,
    );
    expect(commandFactoryMocks.makeInitCommand).toHaveBeenCalledWith(
      dependencies.requireGitHubAuth,
      env,
    );
    expect(commandFactoryMocks.makeInfoCommand).toHaveBeenCalledWith(
      dependencies,
      env,
    );
    expect(commandFactoryMocks.makeAddCommand).toHaveBeenCalledWith(
      dependencies.requireGitHubAuth,
      env,
    );
  });
});
