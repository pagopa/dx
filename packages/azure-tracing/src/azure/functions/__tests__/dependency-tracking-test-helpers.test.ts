/**
 * Tests for dependency-tracking-test-helpers.ts — validates the host-side
 * Docker context detection and diagnostics used by the integration fixtures.
 */
import { describe, expect, it } from "vitest";

import {
  createContainerRuntimeDiagnosticError,
  prepareContainerRuntimeEnvironment,
} from "./dependency-tracking-test-helpers";

type CommandRunner = NonNullable<
  Parameters<typeof prepareContainerRuntimeEnvironment>[1]
>;

describe("prepareContainerRuntimeEnvironment", () => {
  it("imports Rancher Desktop settings from the current Docker context", async () => {
    const env: NodeJS.ProcessEnv = {};
    const commandRunner: CommandRunner = async (_command, args) => {
      const command = args.join(" ");

      if (command === "context show") {
        return { stderr: "", stdout: "rancher-desktop\n" };
      }

      if (command === "context inspect rancher-desktop") {
        return {
          stderr: "",
          stdout: JSON.stringify([
            {
              Endpoints: {
                docker: {
                  Host: "unix:///Users/test/.rd/docker.sock",
                },
              },
              Name: "rancher-desktop",
            },
          ]),
        };
      }

      throw new Error(`Unexpected command: ${command}`);
    };

    const runtimeEnvironment = await prepareContainerRuntimeEnvironment(
      env,
      commandRunner,
    );

    expect(env).toMatchObject({
      DOCKER_HOST: "unix:///Users/test/.rd/docker.sock",
      TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/docker.sock",
    });
    expect(runtimeEnvironment).toMatchObject({
      detectedDockerContext: "rancher-desktop",
      detectedDockerHost: "unix:///Users/test/.rd/docker.sock",
      effectiveDockerHost: "unix:///Users/test/.rd/docker.sock",
      effectiveDockerSocketOverride: "/var/run/docker.sock",
      effectiveTestcontainersHostOverride: undefined,
      preconfiguredDockerHost: undefined,
    });
  });

  it("keeps a preconfigured Rancher Desktop socket and adds the Ryuk override", async () => {
    const env: NodeJS.ProcessEnv = {
      DOCKER_HOST: "unix:///Users/test/.rd/docker.sock",
    };
    const unexpectedCommandRunner: CommandRunner = async () => {
      throw new Error("The Docker context should not be inspected.");
    };

    const runtimeEnvironment = await prepareContainerRuntimeEnvironment(
      env,
      unexpectedCommandRunner,
    );

    expect(env).toMatchObject({
      DOCKER_HOST: "unix:///Users/test/.rd/docker.sock",
      TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: "/var/run/docker.sock",
    });
    expect(runtimeEnvironment).toMatchObject({
      detectedDockerContext: undefined,
      detectedDockerHost: undefined,
      effectiveDockerHost: "unix:///Users/test/.rd/docker.sock",
      effectiveDockerSocketOverride: "/var/run/docker.sock",
      preconfiguredDockerHost: "unix:///Users/test/.rd/docker.sock",
    });
  });
});

describe("createContainerRuntimeDiagnosticError", () => {
  it("includes actionable host diagnostics for Rancher Desktop", () => {
    const error = createContainerRuntimeDiagnosticError(
      new Error("Could not find a working container runtime strategy"),
      {
        detectedDockerContext: "rancher-desktop",
        detectedDockerHost: "unix:///Users/test/.rd/docker.sock",
        detectionError: undefined,
        effectiveDockerHost: "unix:///Users/test/.rd/docker.sock",
        effectiveDockerSocketOverride: "/var/run/docker.sock",
        effectiveTestcontainersHostOverride: undefined,
        preconfiguredDockerHost: undefined,
      },
    );

    expect(error.message).toContain("Detected Docker context: rancher-desktop");
    expect(error.message).toContain(
      'export DOCKER_HOST="unix:///Users/test/.rd/docker.sock"',
    );
    expect(error.message).toContain(
      "export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock",
    );
    expect(error.message).toContain(
      'docker context inspect "$(docker context show)"',
    );
  });
});
