import { describe, expect, it } from "vitest";

import {
  getLatestImageReference,
  parseCliArgs,
  publishWithLatest,
} from "../publish-with-latest.js";

describe("parseCliArgs", () => {
  it("accepts --project-root option", () => {
    const parsed = parseCliArgs(["--project-root", "apps/dockerapp"]);

    expect(parsed.projectRoot).toBe("apps/dockerapp");
  });

  it("accepts positional project root", () => {
    const parsed = parseCliArgs(["apps/dockerapp2"]);

    expect(parsed.projectRoot).toBe("apps/dockerapp2");
  });

  it("throws when project root is missing", () => {
    expect(() => parseCliArgs([])).toThrowErrorMatchingInlineSnapshot(
      "[Error: Usage: dx-docker-release-publish-with-latest --project-root <project-root>]",
    );
  });
});

describe("getLatestImageReference", () => {
  it("derives latest from standard image references", () => {
    expect(getLatestImageReference("ghcr.io/pagopa/service:1.2.3")).toBe(
      "ghcr.io/pagopa/service:latest",
    );
  });

  it("supports registries with custom ports", () => {
    expect(getLatestImageReference("localhost:5000/pagopa/service:1.2.3")).toBe(
      "localhost:5000/pagopa/service:latest",
    );
  });

  it("throws on invalid references without explicit tags", () => {
    expect(() => getLatestImageReference("ghcr.io/pagopa/service")).toThrow(
      "does not include an explicit tag",
    );
  });
});

describe("publishWithLatest", () => {
  it("does not execute docker commands in dry run mode", () => {
    const commandLog: string[] = [];

    publishWithLatest("apps/dockerapp", {
      dryRun: true,
      exists: () => true,
      log: () => undefined,
      readTextFile: () => "ghcr.io/pagopa/dx-slc-dockerapp:0.12.45",
      runCommand: (command, args) => {
        commandLog.push(`${command} ${args.join(" ")}`);
        return 0;
      },
      workspaceRoot: "/workspace",
    });

    expect(commandLog).toHaveLength(0);
  });

  it("pushes version and latest tags in the expected order", () => {
    const commandLog: string[] = [];

    publishWithLatest("apps/dockerapp", {
      dryRun: false,
      exists: () => true,
      log: () => undefined,
      readTextFile: () => "ghcr.io/pagopa/dx-slc-dockerapp:0.12.45",
      runCommand: (command, args) => {
        commandLog.push(`${command} ${args.join(" ")}`);
        return 0;
      },
      workspaceRoot: "/workspace",
    });

    expect(commandLog).toStrictEqual([
      "docker image inspect ghcr.io/pagopa/dx-slc-dockerapp:0.12.45",
      "docker push ghcr.io/pagopa/dx-slc-dockerapp:0.12.45",
      "docker tag ghcr.io/pagopa/dx-slc-dockerapp:0.12.45 ghcr.io/pagopa/dx-slc-dockerapp:latest",
      "docker push ghcr.io/pagopa/dx-slc-dockerapp:latest",
    ]);
  });

  it("throws when the version metadata file is missing", () => {
    expect(() =>
      publishWithLatest("apps/dockerapp", {
        exists: () => false,
        workspaceRoot: "/workspace",
      }),
    ).toThrow("Did you run 'nx release version'?");
  });

  it("throws when docker image inspect fails", () => {
    expect(() =>
      publishWithLatest("apps/dockerapp", {
        dryRun: false,
        exists: () => true,
        readTextFile: () => "ghcr.io/pagopa/dx-slc-dockerapp:0.12.45",
        runCommand: () => 1,
        workspaceRoot: "/workspace",
      }),
    ).toThrow("Could not find local Docker image");
  });

  it("throws when .docker-version content is invalid", () => {
    expect(() =>
      publishWithLatest("apps/dockerapp", {
        exists: () => true,
        readTextFile: () => "ghcr.io/pagopa/dx-slc-dockerapp",
        workspaceRoot: "/workspace",
      }),
    ).toThrow("empty or invalid");
  });
});
