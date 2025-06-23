import { describe, expect, it } from "vitest";

import { makeMockDependencies } from "../../domain/__tests__/data";
import { makeDoctorCommand } from "../doctor.js";

describe("doctor command", () => {
  it("should print a message", () => {
    const mockDependencies = makeMockDependencies();

    const doctorCommand = makeDoctorCommand(mockDependencies);
    doctorCommand.parse([]);
    expect(mockDependencies.writer.write).toHaveBeenCalledWith(
      "Doctor command executed!",
    );
  });
});
