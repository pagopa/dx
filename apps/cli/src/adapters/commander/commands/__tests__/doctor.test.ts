/**
 * Tests for the doctor Commander command flags.
 */

import { describe, expect, it } from "vitest";

import {
  makeMockConfig,
  makeMockDependencies,
} from "../../../../domain/__tests__/data.js";
import { makeDoctorCommand, parseDoctorCommandOptions } from "../doctor.js";

describe("parseDoctorCommandOptions", () => {
  it("returns an empty options object when no flag is provided", () => {
    expect(parseDoctorCommandOptions({})).toEqual({});
  });

  it("returns the provided repository path", () => {
    expect(
      parseDoctorCommandOptions({
        path: "apps/cli",
      }),
    ).toEqual({
      repositoryPath: "apps/cli",
    });
  });

  it("rejects a blank repository path", () => {
    expect(() =>
      parseDoctorCommandOptions({
        path: "   ",
      }),
    ).toThrow("Repository path cannot be empty");
  });
});

describe("makeDoctorCommand", () => {
  it("registers the repository path flag with a short alias", () => {
    const command = makeDoctorCommand(makeMockDependencies(), makeMockConfig());

    expect(command.options.map((option) => option.flags)).toEqual([
      "-p, --path <path>",
    ]);
  });
});
