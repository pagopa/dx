import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";

describe("parseOptions", () => {
  it("returns default options when options are undefined", () => {
    expect(parseOptions(undefined)).toEqual({
      additionalEnvironments: [],
      publish: {
        mode: "github",
      },
      targetNamePrefix: "",
    });
  });

  it("accepts a target-name prefix", () => {
    expect(parseOptions({ targetNamePrefix: "tf" }).targetNamePrefix).toBe(
      "tf",
    );
  });

  it("ignores legacy target-name options", () => {
    const options = {
      initTargetName: "legacy-init",
      prefix: "legacy-",
      publishTargetName: "legacy-publish",
      targetNamePrefix: "tf",
    };

    expect(parseOptions(options)).toEqual({
      additionalEnvironments: [],
      publish: {
        mode: "github",
      },
      targetNamePrefix: "tf",
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
});
