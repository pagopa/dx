import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";

describe("parseOptions", () => {
  it("returns default target names when options are undefined", () => {
    expect(parseOptions(undefined)).toEqual({
      applyTargetName: "tf-apply",
      consoleTargetName: "tf-console",
      docsTargetName: "tf-docs",
      formatTargetName: "tf-fmt",
      initTargetName: "tf-init",
      lintTargetName: "tf-lint",
      outputTargetName: "tf-output",
      planTargetName: "tf-plan",
      testTargetName: "tf-test",
      validateTargetName: "tf-validate",
    });
  });

  it("rejects duplicate target names", () => {
    expect(() =>
      parseOptions({
        applyTargetName: "tf-plan",
        consoleTargetName: "tf-console",
        docsTargetName: "tf-docs",
        formatTargetName: "tf-fmt",
        initTargetName: "tf-init",
        lintTargetName: "tf-lint",
        outputTargetName: "tf-output",
        planTargetName: "tf-plan",
        testTargetName: "tf-test",
        validateTargetName: "tf-validate",
      }),
    ).toThrow('Target name "tf-plan" is duplicated');
  });
});
