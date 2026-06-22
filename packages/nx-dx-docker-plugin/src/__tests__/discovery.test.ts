/**
 * Covers Dockerfile parsing edge cases used to infer a generic Nx build context.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import {
  getDockerBuildContext,
  getDockerfileArgument,
} from "../discovery.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-docker-discovery-"),
  );

  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });

  return workspaceRoot;
};

describe("getDockerBuildContext", () => {
  it("falls back to the project root when the Dockerfile has no local COPY or ADD sources", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("services", "api");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "RUN npm --version",
        "COPY --from=builder /app/dist ./dist",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("services/api");
  });

  it("supports JSON COPY syntax with flags and resolves the narrowest valid ancestor context", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "sample-app");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "workspace.yaml"), "name: demo\n", "utf8");
    await fs.writeFile(path.join(workspaceRoot, projectRoot, "package.json"), "{}\n", "utf8");
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        'COPY --chown=node:node ["workspace.yaml", "apps/sample-app/package.json", "/workspace/"]',
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe(".");
  });

  it("ignores remote ADD sources when choosing the build context", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("containers", "runner");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM ubuntu:24.04",
        "ADD https://example.com/archive.tgz /tmp/archive.tgz",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("containers/runner");
  });

  it("supports wildcard COPY sources by checking the fixed directory prefix", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "metrics");

    await fs.mkdir(path.join(workspaceRoot, projectRoot, "dist"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "dist", "app.mjs"),
      "export {};\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY dist/*.mjs ./dist/",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/metrics");
  });

  it("ignores COPY flags without '=' while keeping the local source detection generic", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "docs-image");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      "{}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "# syntax=docker/dockerfile:1.7",
        "FROM node:22-alpine",
        "COPY --exclude *.md package.json ./",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/docs-image");
  });

  it("breaks ties between equally deep valid child contexts deterministically", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "ambiguous-image");

    await fs.mkdir(path.join(workspaceRoot, projectRoot, "alpha"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, projectRoot, "beta"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "alpha", "package.json"),
      "{}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "beta", "package.json"),
      "{}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY package.json ./",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("packages/ambiguous-image/alpha");
  });

  it("treats root-level wildcard sources as files owned by the current project context", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "root-wildcard");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "package.json"),
      "{}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "tsconfig.json"),
      "{}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY *.json ./",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/root-wildcard");
  });

  it("falls back safely when a JSON COPY instruction is malformed", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "broken-json-copy");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        'COPY ["package.json", ./',
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/broken-json-copy");
  });

  it("ignores JSON COPY instructions that only copy from another stage", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "stage-json-copy");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine AS build",
        "FROM node:22-alpine",
        'COPY --from=build ["/workspace/dist", "./dist"]',
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/stage-json-copy");
  });

  it("falls back when a JSON COPY instruction is valid JSON but does not contain source and destination", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "short-json-copy");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        'COPY ["package.json"]',
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/short-json-copy");
  });

  it("refuses parent-directory sources that Docker would reject outside the build context", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("apps", "invalid-parent-source");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY ../shared ./shared",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe("apps/invalid-parent-source");
  });

  it("handles multi-line COPY instructions before evaluating candidate contexts", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("packages", "worker-image");

    await fs.mkdir(path.join(workspaceRoot, projectRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "pnpm-workspace.yaml"), "packages: []\n", "utf8");
    await fs.writeFile(path.join(workspaceRoot, projectRoot, "package.json"), "{}\n", "utf8");
    await fs.writeFile(
      path.join(workspaceRoot, projectRoot, "Dockerfile"),
      [
        "FROM node:22-alpine",
        "COPY pnpm-workspace.yaml \\",
        "     packages/worker-image/package.json \\",
        "     ./",
      ].join("\n"),
      "utf8",
    );

    expect(
      getDockerBuildContext(
        workspaceRoot,
        projectRoot,
        path.join(projectRoot, "Dockerfile"),
      ),
    ).toBe(".");
  });
});

describe("getDockerfileArgument", () => {
  it("returns Dockerfile when the file lives inside the build context", () => {
    expect(getDockerfileArgument("apps/api", "apps/api/Dockerfile")).toBe("Dockerfile");
  });

  it("returns a relative path when the build context is a child directory", () => {
    expect(getDockerfileArgument("apps/api/runtime", "apps/api/Dockerfile")).toBe("../Dockerfile");
  });
});