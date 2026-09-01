import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";

describe("parseOptions", () => {
  it("returns default target names when options are undefined", () => {
    expect(parseOptions(undefined)).toEqual({
      additionalEnvironments: [],
      applyTargetName: "apply",
      consoleTargetName: "console",
      docsTargetName: "docs",
      e2eTargetName: "e2e",
      formatTargetName: "fmt",
      initTargetName: "init",
      lintTargetName: "lint",
      outputTargetName: "output",
      planTargetName: "plan",
      publish: {
        mode: "github",
      },
      publishTargetName: "nx-release-publish",
      testIntegrationTargetName: "test-integration",
      testTargetName: "test",
      validateTargetName: "validate",
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
        applyTargetName: "plan",
        consoleTargetName: "console",
        docsTargetName: "docs",
        e2eTargetName: "e2e",
        formatTargetName: "fmt",
        initTargetName: "init",
        lintTargetName: "lint",
        outputTargetName: "output",
        planTargetName: "plan",
        testIntegrationTargetName: "test-integration",
        testTargetName: "test",
        validateTargetName: "validate",
      }),
    ).toThrow('Target name "plan" is duplicated');
  });

  it("rejects duplicate integration and E2E target names", () => {
    expect(() =>
      parseOptions({
        e2eTargetName: "test-integration",
      }),
    ).toThrow('Target name "test-integration" is duplicated');
  });
});
