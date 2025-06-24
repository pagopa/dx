import { describe, expect, it } from "vitest";

import { makeMockDependencies } from "../../domain/__tests__/data";
import { makeDoctorCommand } from "../doctor";

describe("doctor command", () => {
  it("should log no repository root found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.findRepositoryRoot.mockImplementationOnce(null);

    const doctorCommand = makeDoctorCommand(deps);
    doctorCommand.parse([]);

    expect(deps.logger.error).toHaveBeenCalledWith(
      "Could not find repository root. Make sure to have the repo initialized.",
    );
  });
});
