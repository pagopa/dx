import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";

describe("parseOptions", () => {
  it("returns default target names when options are undefined", () => {
    expect(parseOptions(undefined)).toEqual({
      additionalEnvironments: [],
      applyTargetName: "tf-apply",
      consoleTargetName: "tf-console",
      docsTargetName: "terraform-docs",
      formatTargetName: "tf-fmt",
      initTargetName: "tf-init",
      lintTargetName: "tflint",
      outputTargetName: "tf-output",
      planTargetName: "tf-plan",
      planUploadTargetName: "tf-plan-upload",
      publish: {
        mode: "github",
      },
      publishTargetName: "nx-release-publish",
      sensitiveOutputKeys: [],
      testTargetName: "tf-test",
      validateTargetName: "tf-validate",
    });
  });

  it("accepts publish options without github owner", () => {
    expect(
      parseOptions({
        publish: {
          mode: "github",
        },
      }),
    ).toMatchObject({
      publish: {
        mode: "github",
      },
    });
  });

  it("accepts plugin-level github owner defaults", () => {
    expect(
      parseOptions({
        publish: {
          github: {
            owner: "pagopa-dx",
          },
          mode: "github",
        },
      }).publish.github?.owner,
    ).toBe("pagopa-dx");
  });

  it("accepts additional environment names", () => {
    expect(
      parseOptions({
        additionalEnvironments: ["sandbox", "qa_env"],
      }).additionalEnvironments,
    ).toEqual(["sandbox", "qa_env"]);
  });

  it("accepts sensitive Terraform output keys", () => {
    expect(
      parseOptions({
        sensitiveOutputKeys: ["hidden-link", "APPINSIGHTS_INSTRUMENTATIONKEY"],
      }).sensitiveOutputKeys,
    ).toEqual(["hidden-link", "APPINSIGHTS_INSTRUMENTATIONKEY"]);
  });

  it("rejects invalid additional environment names", () => {
    expect(() =>
      parseOptions({
        additionalEnvironments: ["QA"],
      }),
    ).toThrow("additionalEnvironments.0");
  });

  it("rejects empty github owner", () => {
    expect(() =>
      parseOptions({
        publish: {
          github: {
            owner: "",
          },
          mode: "github",
        },
      }),
    ).toThrow("publish.github.owner");
  });

  it("rejects duplicate target names", () => {
    expect(() =>
      parseOptions({
        applyTargetName: "tf-plan",
        consoleTargetName: "tf-console",
        docsTargetName: "terraform-docs",
        formatTargetName: "tf-fmt",
        initTargetName: "tf-init",
        lintTargetName: "tflint",
        outputTargetName: "tf-output",
        planTargetName: "tf-plan",
        testTargetName: "tf-test",
        validateTargetName: "tf-validate",
      }),
    ).toThrow('Target name "tf-plan" is duplicated');
  });
});
