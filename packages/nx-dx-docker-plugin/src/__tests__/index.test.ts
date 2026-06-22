/**
 * Verifies the wrapper plugin keeps Nx discovery while adding workspace-aware Docker defaults.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import { createNodesV2 } from "../index.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-dx-docker-plugin-"),
  );

  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });

  return workspaceRoot;
};

describe("createNodesV2", () => {
  it("discovers Dockerfiles like the upstream Nx Docker plugin", () => {
    expect(createNodesV2[0]).toBe("**/Dockerfile");
  });

  it("uses workspace root context when COPY needs files outside the project root", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("services", "sample-app");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "package.json"),
      JSON.stringify({
        private: true,
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
      "utf8",
    );
    await fs.writeFile(path.join(workspaceRoot, "nx.json"), "{}\n", "utf8");
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY package.json pnpm-lock.yaml nx.json ./",
        "COPY services/sample-app/package.json ./services/sample-app/",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      JSON.stringify({
        description: "Sample application",
        name: "sample-app",
      }),
      "utf8",
    );

    const result = await createNodesV2[1](
      [path.join(projectRoot, "Dockerfile")],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot,
      },
    );

    const buildTarget =
      result[0]?.[1].projects?.[projectRoot]?.targets?.["docker:build"];
    expect(buildTarget?.executor).toBe("@pagopa/nx-dx-docker-plugin:build");
    expect(buildTarget?.options?.cwd).toBe(".");
    expect(buildTarget?.options?.args).toEqual(
      expect.arrayContaining([
        "--file services/sample-app/Dockerfile",
        expect.stringContaining("org.opencontainers.image.description"),
      ]),
    );
    expect(
      result[0]?.[1].projects?.[projectRoot]?.targets?.["nx-release-publish"]
        ?.executor,
    ).toBe("@pagopa/nx-dx-docker-plugin:release-publish");
  });

  it("uses the deepest child directory that satisfies local COPY sources", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "probe-image");

    await fs.mkdir(path.join(workspaceRoot, projectRoot, "app"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      ["FROM golang:1.22-alpine", "COPY package.json .", "COPY . ."].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "project.json"),
      JSON.stringify({
        description: "Probe app",
        name: "probe-app",
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "app", "package.json"),
      JSON.stringify({
        name: "probe-runtime",
      }),
      "utf8",
    );

    const result = await createNodesV2[1](
      [path.join(projectRoot, "Dockerfile")],
      undefined,
      {
        nxJsonConfiguration: {},
        workspaceRoot,
      },
    );

    const buildTarget =
      result[0]?.[1].projects?.[projectRoot]?.targets?.["docker:build"];
    expect(buildTarget?.executor).toBe("@pagopa/nx-dx-docker-plugin:build");
    expect(buildTarget?.options?.cwd).toBe(
      `${projectRoot.replaceAll(path.sep, "/")}/app`,
    );
    expect(buildTarget?.options?.args).toEqual(
      expect.arrayContaining(["--file ../Dockerfile"]),
    );
  });
});
