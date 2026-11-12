/**
 * Integration suite for the published artifact. It packs
 * `@pagopa/azure-tracing`, installs the tarball in a scratch consumer that does
 * not inherit the workspace overrides, and asserts that Redis dependency
 * telemetry keeps flowing and that `@opentelemetry/api` stays deduplicated.
 *
 * The workspace suites import the sources and resolve the overridden dependency
 * tree, so they cannot catch a published package that loses instrumentation.
 */
import { globSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterAll, test as baseTest, beforeAll, expect } from "vitest";

import {
  createContainerFixture,
  type DependencyTrackingFixtures,
  telemetryCollectorFixture,
} from "./dependency-tracking-test-fixtures";
import {
  createRunId,
  dependencyTestTimeoutMs,
  runProcess,
  type TelemetryCollector,
} from "./dependency-tracking-test-helpers";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const consumerFixtureDirectory = fileURLToPath(
  new URL("./fixtures/consumer/", import.meta.url),
);
const consumerFixtureFiles = ["preload.mjs", "scenario.mjs"] as const;
const redisPort = 6379;

const test = baseTest.extend<
  DependencyTrackingFixtures & {
    readonly redisContainer: StartedTestContainer;
  }
>({
  redisContainer: createContainerFixture(async () =>
    new GenericContainer("redis:7.4-alpine")
      .withExposedPorts(redisPort)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  ),
  telemetryCollector: telemetryCollectorFixture,
});

let workDirectory: string;
let packageTarballPath: string;

const requireValue = <T>(value: T | undefined, message: string) => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

/**
 * Builds and packs the package so that the consumer exercises the artifact that
 * would be published, including its own `dependencies` and `exports`.
 */
const packPackage = async () => {
  const tarballDirectory = join(workDirectory, "tarball");
  await mkdir(tarballDirectory);

  await runProcess("pnpm", ["run", "build"], "The package build failed.", {
    cwd: packageRoot,
  });
  await runProcess(
    "pnpm",
    ["pack", "--pack-destination", tarballDirectory],
    "Packing the package failed.",
    { cwd: packageRoot },
  );

  const [tarball] = globSync("*.tgz", { cwd: tarballDirectory });

  return join(
    tarballDirectory,
    requireValue(tarball, "pnpm pack did not produce a tarball."),
  );
};

/**
 * Installs the packed tarball in a throwaway consumer. `npm` is used on purpose:
 * it resolves the tree from the published manifest only, without the workspace
 * `pnpm-workspace.yaml` overrides or catalog entries.
 */
const installConsumer = async (redisMajorVersion: string) => {
  const consumerDirectory = await mkdtemp(join(workDirectory, "consumer-"));

  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify(
      { name: "packed-package-consumer", private: true, type: "module" },
      null,
      2,
    )}\n`,
  );

  await Promise.all(
    consumerFixtureFiles.map((file) =>
      copyFile(
        join(consumerFixtureDirectory, file),
        join(consumerDirectory, file),
      ),
    ),
  );

  await runProcess(
    "npm",
    [
      "install",
      packageTarballPath,
      `redis@${redisMajorVersion}`,
      "--no-audit",
      "--no-fund",
      "--loglevel=error",
    ],
    "Installing the packed package in the consumer failed.",
    { cwd: consumerDirectory },
  );

  return consumerDirectory;
};

const runConsumerScenario = async (
  consumerDirectory: string,
  env: NodeJS.ProcessEnv,
) => {
  await runProcess(
    process.execPath,
    [join(consumerDirectory, "scenario.mjs")],
    "The consumer scenario failed.",
    {
      cwd: consumerDirectory,
      env: {
        ...process.env,
        ...env,
        NODE_OPTIONS: `--import=${join(consumerDirectory, "preload.mjs")}`,
      },
    },
  );
};

beforeAll(async () => {
  workDirectory = await mkdtemp(join(tmpdir(), "azure-tracing-consumer-"));
  packageTarballPath = await packPackage();
}, dependencyTestTimeoutMs);

afterAll(async () => {
  if (workDirectory !== undefined) {
    await rm(workDirectory, { force: true, recursive: true });
  }
});

/**
 * Installs the packed package for the given Redis major version, traces a Redis
 * round trip through the public entrypoint, and returns the Redis commands the
 * collector received. `redis` is a consumer choice, not a packaged dependency,
 * so each supported major version is exercised.
 */
const traceRedisRoundTrip = async (
  redisMajorVersion: string,
  redisContainer: StartedTestContainer,
  telemetryCollector: TelemetryCollector,
) => {
  const consumerDirectory = await installConsumer(redisMajorVersion);
  const runId = createRunId();
  const redisKey = `key:${runId}`;

  // A duplicated API creates a second instrumentation registry, which silently
  // detaches the instrumentations from the tracer provider.
  expect(
    globSync("**/node_modules/@opentelemetry/api/package.json", {
      cwd: consumerDirectory,
    }),
    "@opentelemetry/api must resolve to a single copy in the consumer tree",
  ).toHaveLength(1);

  await runConsumerScenario(consumerDirectory, {
    APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
    APPLICATIONINSIGHTS_CONNECTION_STRING: telemetryCollector.connectionString,
    APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
    APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
    NODE_EXTRA_CA_CERTS: telemetryCollector.caCertificatePath,
    REDIS_KEY: redisKey,
    REDIS_URL: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(redisPort)}`,
    REDIS_VALUE: `value:${runId}`,
  });

  const dependencies = await telemetryCollector.waitForRemoteDependencies(
    (dependency) =>
      dependency.type === "redis" &&
      [dependency.data, dependency.name]
        .filter((value) => value !== undefined)
        .some(
          (value) =>
            value?.includes(redisKey) === true ||
            value?.toUpperCase().includes("SET") === true ||
            value?.toUpperCase().includes("GET") === true,
        ),
  );

  return dependencies
    .flatMap((dependency) => [dependency.name, dependency.data])
    .filter((value): value is string => value !== undefined)
    .map((value) => value.toUpperCase());
};

test(
  "exports Redis dependency telemetry to consumers installing redis@6",
  async ({ redisContainer, telemetryCollector }) => {
    const commands = await traceRedisRoundTrip(
      "6",
      redisContainer,
      telemetryCollector,
    );

    expect(commands.some((command) => command.includes("SET"))).toBe(true);
    expect(commands.some((command) => command.includes("GET"))).toBe(true);
  },
  dependencyTestTimeoutMs,
);

test(
  "exports Redis dependency telemetry to consumers installing redis@5",
  async ({ redisContainer, telemetryCollector }) => {
    const commands = await traceRedisRoundTrip(
      "5",
      redisContainer,
      telemetryCollector,
    );

    expect(commands.some((command) => command.includes("SET"))).toBe(true);
    expect(commands.some((command) => command.includes("GET"))).toBe(true);
  },
  dependencyTestTimeoutMs,
);
