/**
 * Covers runtime Docker metadata expansion without depending on a real Docker daemon.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => ({
  execSync: vi.fn<(...args: [string, ...unknown[]]) => string>(() => ""),
}));

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn((filePath: string) => {
    if (filePath.endsWith(".env")) {
      return "FROM_ENV_FILE=loaded\nSHARED=value-from-file\n";
    }

    return "";
  }),
}));

vi.mock("node:child_process", () => ({
  execSync: childProcessMocks.execSync,
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: fsMocks.existsSync,
    readFileSync: fsMocks.readFileSync,
  };
});

import { buildExecutor } from "../build.ts";

describe("build executor", () => {
  afterEach(() => {
    childProcessMocks.execSync.mockClear();
    fsMocks.existsSync.mockClear();
    fsMocks.readFileSync.mockClear();
    fsMocks.existsSync.mockImplementation(() => true);
    fsMocks.readFileSync.mockImplementation((filePath: string) => {
      if (filePath.endsWith(".env")) {
        return "FROM_ENV_FILE=loaded\nSHARED=value-from-file\n";
      }

      return "";
    });
    delete process.env.GITHUB_DEFAULT_BRANCH;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REF;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_SHA;
    delete process.env.TAG_NAME;
  });

  it("runs docker build with the normalized working directory and environment", async () => {
    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example", "--file apps/example/Dockerfile"],
        cwd: "apps/example",
        env: {
          DOCKER_BUILDKIT: "1",
        },
        quiet: true,
      },
      {
        projectName: "example",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example --file apps/example/Dockerfile",
      expect.objectContaining({
        cwd: "/workspace/apps/example",
        env: expect.objectContaining({
          DOCKER_BUILDKIT: "1",
        }),
        stdio: ["ignore", "ignore", "pipe"],
      }),
    );
  });

  it("loads envFile values and lets explicit environment variables override them", async () => {
    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example"],
        env: {
          SHARED: "value-from-options",
        },
        envFile: ".env",
        quiet: true,
      },
      {
        projectName: "example",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example",
      expect.objectContaining({
        env: expect.objectContaining({
          FROM_ENV_FILE: "loaded",
          SHARED: "value-from-options",
        }),
      }),
    );
  });

  it("expands metadata-action style tags for Git tag builds", async () => {
    process.env.GITHUB_REF = "refs/tags/@draft/release@v1.2.3";
    process.env.GITHUB_REF_NAME = "@draft/release@v1.2.3";
    process.env.GITHUB_SHA = "1234567890abcdef";
    process.env.TAG_NAME = "v1.2.3";

    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example"],
        metadata: {
          labels: ["com.acme.channel=stable"],
          tags: [
            "type=raw,value=latest,enable={{is_default_branch}}",
            "type=semver,pattern={{version}}",
            "type=semver,pattern={{major}}.{{minor}}",
            "type=semver,pattern={{major}},enable=${{ !startsWith(github.ref, 'refs/tags/v0.') }}",
            "type=ref,event=branch",
            "type=sha",
            "${{ env.TAG_NAME }}",
          ],
        },
        quiet: true,
      },
      {
        projectName: "example",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example --tag ghcr.io/pagopa/example:1.2.3 --tag ghcr.io/pagopa/example:1.2 --tag ghcr.io/pagopa/example:1 --tag ghcr.io/pagopa/example:sha-1234567 --tag ghcr.io/pagopa/example:v1.2.3 --label com.acme.channel=stable",
      expect.any(Object),
    );
  });

  it("honors default-branch and branch tag expansion on branch builds", async () => {
    process.env.GITHUB_DEFAULT_BRANCH = "main";
    process.env.GITHUB_REF = "refs/heads/main";
    process.env.GITHUB_REF_NAME = "main";
    process.env.GITHUB_SHA = "1234567890abcdef";

    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example"],
        metadata: {
          tags: [
            "type=raw,value=latest,enable={{is_default_branch}}",
            "type=ref,event=branch",
            "type=sha",
          ],
        },
        quiet: true,
      },
      {
        projectName: "example",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example --tag ghcr.io/pagopa/example:main --tag ghcr.io/pagopa/example:sha-1234567",
      expect.any(Object),
    );
  });

  it("skips the major tag rule for v0 releases when the enable expression evaluates to false", async () => {
    process.env.GITHUB_REF = "refs/tags/v0.5.0";
    process.env.GITHUB_REF_NAME = "v0.5.0";
    process.env.GITHUB_SHA = "1234567890abcdef";

    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example"],
        metadata: {
          tags: [
            "type=semver,pattern={{major}},enable=${{ !startsWith(github.ref, 'refs/tags/v0.') }}",
          ],
        },
        quiet: true,
      },
      {
        projectName: "example",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example",
      expect.any(Object),
    );
  });

  it("selects the matching project tag on head instead of an unrelated project tag", async () => {
    childProcessMocks.execSync.mockImplementation((command: string) => {
      if (command === "git tag --points-at HEAD") {
        return ["dockerapp2@0.1.14", "dockerapp@0.12.71", "dockerapp@0.12.72"].join("\n");
      }

      if (command === "git branch --show-current") {
        return "docker";
      }

      if (command === "git symbolic-ref refs/remotes/origin/HEAD") {
        return "refs/remotes/origin/main";
      }

      if (command === "git rev-parse HEAD") {
        return "9457618f7fc0c68c2e29fe03576e8e7b570db001";
      }

      return "";
    });

    await buildExecutor(
      {
        args: ["--tag ghcr.io/pagopa/example"],
        metadata: {
          tags: [
            "type=semver,pattern={{version}}",
            "type=semver,pattern={{major}}.{{minor}}",
            "type=semver,pattern={{major}}",
            "type=ref,event=branch",
            "type=sha",
          ],
        },
        quiet: true,
      },
      {
        projectName: "dockerapp",
        root: "/workspace",
      },
    );

    expect(childProcessMocks.execSync).toHaveBeenCalledWith(
      "docker build . --tag ghcr.io/pagopa/example --tag ghcr.io/pagopa/example:0.12.72 --tag ghcr.io/pagopa/example:0.12 --tag ghcr.io/pagopa/example:0 --tag ghcr.io/pagopa/example:sha-9457618",
      expect.any(Object),
    );
  });

  it("throws when executor options are invalid", async () => {
    await expect(
      buildExecutor(JSON.parse('{"args":"--broken"}'), { root: "/workspace" }),
    ).rejects.toThrow("Invalid Docker build executor options.");
  });
});