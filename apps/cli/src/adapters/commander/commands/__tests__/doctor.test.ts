import { describe, expect, it } from "vitest";

import { makeMockDependencies } from "../../../../domain/__tests__/data.js";
import { makeDoctorCommand } from "../doctor.js";

describe("doctor command", () => {
  it("should handle when no repository root is found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.findRepositoryRoot.mockImplementationOnce(() => null);

    const doctorCommand = makeDoctorCommand(deps);

    expect(doctorCommand.name()).toBe("doctor");
    expect(doctorCommand.description()).toBe(
      "Verify the repository setup according to the DevEx guidelines",
    );
  });
});
