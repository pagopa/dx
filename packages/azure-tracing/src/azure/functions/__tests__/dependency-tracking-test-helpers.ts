/**
 * Shared helpers for dependency-tracking integration tests that preload the
 * Azure tracing entrypoint and assert exported Application Insights envelopes.
 */
import { execFile, type ExecFileOptions } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse } from "node:http";
import { createServer } from "node:https";
import { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";
import { z } from "zod";

const packageRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const preloadModulePath = fileURLToPath(
  new URL("../index.mts", import.meta.url),
);
const scenarioScriptPath = fileURLToPath(
  new URL("./fixtures/run-dependency-scenario.ts", import.meta.url),
);
const collectorCertificatePath = fileURLToPath(
  new URL("./fixtures/telemetry-collector-cert.pem", import.meta.url),
);
const collectorPrivateKeyPath = fileURLToPath(
  new URL("./fixtures/telemetry-collector-key.pem", import.meta.url),
);

const azuriteAccountKey =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

const remoteDependencyDataSchema = z
  .object({
    data: z.string().optional(),
    name: z.string().optional(),
    target: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

const telemetryEnvelopeSchema = z
  .object({
    data: z
      .object({
        baseData: remoteDependencyDataSchema.optional(),
        baseType: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const telemetryBatchSchema = z.array(telemetryEnvelopeSchema);
const dockerContextInspectSchema = z
  .array(
    z
      .object({
        Endpoints: z
          .object({
            docker: z
              .object({
                Host: z.string().min(1),
              })
              .optional(),
          })
          .passthrough(),
        Name: z.string().min(1),
      })
      .passthrough(),
  )
  .min(1);

export interface ContainerRuntimeEnvironmentPreparation {
  readonly detectedDockerContext: string | undefined;
  readonly detectedDockerHost: string | undefined;
  readonly detectionError: string | undefined;
  readonly effectiveDockerHost: string | undefined;
  readonly effectiveDockerSocketOverride: string | undefined;
  readonly effectiveTestcontainersHostOverride: string | undefined;
  readonly preconfiguredDockerHost: string | undefined;
}
export type RemoteDependencyData = z.infer<typeof remoteDependencyDataSchema>;

export interface TelemetryCollector {
  readonly caCertificatePath: string;
  close: () => Promise<void>;
  readonly connectionString: string;
  getRemoteDependencies: () => RemoteDependencyData[];
  waitForRemoteDependencies: (
    predicate: (dependency: RemoteDependencyData) => boolean,
  ) => Promise<readonly RemoteDependencyData[]>;
}

interface CapturedRequest {
  readonly body: string;
  readonly path: string;
}

interface CollectorCertificate {
  readonly certificate: Buffer;
  readonly privateKey: Buffer;
}

interface CommandOutput {
  readonly stderr: string;
  readonly stdout: string;
}

type CommandRunner = (
  command: string,
  args: readonly string[],
  options?: ExecFileOptions,
) => Promise<CommandOutput>;

interface DockerContextConfiguration {
  readonly contextName: string;
  readonly dockerHost: string;
}

type Scenario = "cosmos" | "redis" | "storage";
type TelemetryEnvelope = z.infer<typeof telemetryEnvelopeSchema>;

export const dependencyTestTimeoutMs = 300_000;

export const cosmosEmulatorKey =
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

const getHeaderValue = (value: readonly string[] | string | undefined) =>
  Array.isArray(value) ? value[0] : value;

const execFileAsync = promisify(execFile);

const acceptedTelemetryResponse = JSON.stringify({
  errors: [],
  itemsAccepted: 1,
  itemsReceived: 1,
});

const toOutputString = (value: unknown) => {
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  if (typeof value === "string") {
    return value;
  }

  return value === null || value === undefined ? "" : String(value);
};

const getErrorProperty = (error: unknown, property: string) =>
  typeof error === "object" && error !== null
    ? toOutputString(Object.getOwnPropertyDescriptor(error, property)?.value)
    : "";

const runProcess = async (
  command: string,
  args: readonly string[],
  failureMessage: string,
  options: ExecFileOptions = {},
) => {
  try {
    await execFileAsync(command, [...args], {
      ...options,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      [
        failureMessage,
        `Exit code: ${getErrorProperty(error, "code") || "unknown"}`,
        `Signal: ${getErrorProperty(error, "signal") || "none"}`,
        `STDOUT:\n${getErrorProperty(error, "stdout")}`,
        `STDERR:\n${getErrorProperty(error, "stderr")}`,
      ].join("\n\n"),
      { cause: error },
    );
  }
};

const trimOutput = (value: string | undefined) => value?.trim() || undefined;

const renderDiagnosticValue = (value: string | undefined) =>
  value && value.length > 0 ? value : "<unset>";

const extractDockerSocketPath = (dockerHost: string) =>
  dockerHost.startsWith("unix://")
    ? dockerHost.replace("unix://", "")
    : undefined;

const isAlternativeDockerDesktopRuntime = (
  contextName: string | undefined,
  dockerHost: string | undefined,
) => {
  const normalizedContextName = contextName?.toLowerCase();

  return (
    normalizedContextName === "colima" ||
    normalizedContextName === "rancher-desktop" ||
    dockerHost?.includes("/.colima/") === true ||
    dockerHost?.includes("/.rd/docker.sock") === true
  );
};

const getDockerSocketOverride = (
  contextName: string | undefined,
  dockerHost: string | undefined,
) =>
  isAlternativeDockerDesktopRuntime(contextName, dockerHost)
    ? "/var/run/docker.sock"
    : undefined;

const runCommand: CommandRunner = async (
  command,
  args,
  options: ExecFileOptions = {},
) => {
  try {
    const { stderr, stdout } = await execFileAsync(command, [...args], {
      ...options,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      stderr: toOutputString(stderr),
      stdout: toOutputString(stdout),
    };
  } catch (error) {
    throw new Error(
      [
        `Failed to run ${command} ${args.join(" ")}`.trim(),
        `Exit code: ${getErrorProperty(error, "code") || "unknown"}`,
        `Signal: ${getErrorProperty(error, "signal") || "none"}`,
        `STDOUT:\n${getErrorProperty(error, "stdout")}`,
        `STDERR:\n${getErrorProperty(error, "stderr")}`,
      ].join("\n\n"),
      { cause: error },
    );
  }
};

const getDockerContextConfiguration = async (
  commandRunner: CommandRunner,
): Promise<DockerContextConfiguration> => {
  const { stdout: contextStdout } = await commandRunner("docker", [
    "context",
    "show",
  ]);
  const contextName = trimOutput(contextStdout);

  if (!contextName) {
    throw new Error("`docker context show` did not return a context name.");
  }

  const { stdout: inspectStdout } = await commandRunner("docker", [
    "context",
    "inspect",
    contextName,
  ]);

  let parsedInspectResult: unknown;

  try {
    parsedInspectResult = JSON.parse(inspectStdout);
  } catch (error) {
    throw new Error("`docker context inspect` returned invalid JSON.", {
      cause: error,
    });
  }

  const parsedContext =
    dockerContextInspectSchema.safeParse(parsedInspectResult);

  if (!parsedContext.success) {
    throw new Error(
      `Unexpected \`docker context inspect\` payload: ${parsedContext.error.message}`,
    );
  }

  const dockerHost = trimOutput(parsedContext.data[0].Endpoints.docker?.Host);

  if (!dockerHost) {
    throw new Error(
      `The current Docker context "${contextName}" does not expose a Docker endpoint.`,
    );
  }

  return { contextName, dockerHost };
};

const getPreparedRuntimeConfiguration = (
  env: NodeJS.ProcessEnv,
  preconfiguredDockerHost: string | undefined,
  detectedDockerContext: string | undefined,
  detectedDockerHost: string | undefined,
  detectionError: string | undefined,
): ContainerRuntimeEnvironmentPreparation => ({
  detectedDockerContext,
  detectedDockerHost,
  detectionError,
  effectiveDockerHost: trimOutput(env.DOCKER_HOST),
  effectiveDockerSocketOverride: trimOutput(
    env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE,
  ),
  effectiveTestcontainersHostOverride: trimOutput(
    env.TESTCONTAINERS_HOST_OVERRIDE,
  ),
  preconfiguredDockerHost,
});

export const prepareContainerRuntimeEnvironment = async (
  env: NodeJS.ProcessEnv = process.env,
  commandRunner: CommandRunner = runCommand,
): Promise<ContainerRuntimeEnvironmentPreparation> => {
  const preconfiguredDockerHost = trimOutput(env.DOCKER_HOST);

  if (preconfiguredDockerHost) {
    const socketOverride = getDockerSocketOverride(
      undefined,
      preconfiguredDockerHost,
    );

    if (
      !trimOutput(env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE) &&
      socketOverride
    ) {
      env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = socketOverride;
    }

    return getPreparedRuntimeConfiguration(
      env,
      preconfiguredDockerHost,
      undefined,
      undefined,
      undefined,
    );
  }

  try {
    const { contextName, dockerHost } =
      await getDockerContextConfiguration(commandRunner);

    env.DOCKER_HOST = dockerHost;

    const socketOverride = getDockerSocketOverride(contextName, dockerHost);

    if (
      !trimOutput(env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE) &&
      socketOverride
    ) {
      env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = socketOverride;
    }

    return getPreparedRuntimeConfiguration(
      env,
      preconfiguredDockerHost,
      contextName,
      dockerHost,
      undefined,
    );
  } catch (error) {
    return getPreparedRuntimeConfiguration(
      env,
      preconfiguredDockerHost,
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }
};

export const isMissingContainerRuntimeError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("Could not find a working container runtime strategy");

export const createContainerRuntimeDiagnosticError = (
  error: unknown,
  containerRuntimeEnvironment: ContainerRuntimeEnvironmentPreparation,
) => {
  const suggestedDockerHost =
    containerRuntimeEnvironment.detectedDockerHost ??
    containerRuntimeEnvironment.preconfiguredDockerHost;
  const suggestedDockerSocketOverride = getDockerSocketOverride(
    containerRuntimeEnvironment.detectedDockerContext,
    suggestedDockerHost,
  );
  const dockerSocketPath = extractDockerSocketPath(suggestedDockerHost ?? "");

  return new Error(
    [
      "Testcontainers could not connect to the host container runtime.",
      "",
      `Detected Docker context: ${renderDiagnosticValue(
        containerRuntimeEnvironment.detectedDockerContext,
      )}`,
      `Detected Docker endpoint: ${renderDiagnosticValue(
        containerRuntimeEnvironment.detectedDockerHost,
      )}`,
      `Preconfigured DOCKER_HOST: ${renderDiagnosticValue(
        containerRuntimeEnvironment.preconfiguredDockerHost,
      )}`,
      `Effective DOCKER_HOST: ${renderDiagnosticValue(
        containerRuntimeEnvironment.effectiveDockerHost,
      )}`,
      `Effective TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: ${renderDiagnosticValue(
        containerRuntimeEnvironment.effectiveDockerSocketOverride,
      )}`,
      `Effective TESTCONTAINERS_HOST_OVERRIDE: ${renderDiagnosticValue(
        containerRuntimeEnvironment.effectiveTestcontainersHostOverride,
      )}`,
      ...(containerRuntimeEnvironment.detectionError
        ? [
            "",
            `Docker context auto-detection error: ${containerRuntimeEnvironment.detectionError}`,
          ]
        : []),
      "",
      "If you are running the suite directly on the host, inspect the active Docker context and export its endpoint before rerunning:",
      '  docker context inspect "$(docker context show)"',
      ...(suggestedDockerHost
        ? [`  export DOCKER_HOST="${suggestedDockerHost}"`]
        : []),
      ...(dockerSocketPath ? [`  ls -l "${dockerSocketPath}"`] : []),
      ...(suggestedDockerSocketOverride
        ? [
            `  export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=${suggestedDockerSocketOverride}`,
          ]
        : []),
      "  pnpm nx run @pagopa/azure-tracing:integration",
      "",
      `Original error: ${error instanceof Error ? error.message : String(error)}`,
    ].join("\n"),
    { cause: error instanceof Error ? error : undefined },
  );
};

const decodeRequestBody = (
  contentEncoding: readonly string[] | string | undefined,
  body: Buffer,
) => {
  const encoding = getHeaderValue(contentEncoding);
  return encoding === "gzip"
    ? gunzipSync(body).toString("utf8")
    : body.toString("utf8");
};

const parseBatch = (body: string) => {
  try {
    const parsedBody: unknown = JSON.parse(body);
    return telemetryBatchSchema.safeParse(parsedBody);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    return telemetryBatchSchema.safeParse(undefined);
  }
};

const extractRemoteDependency = (envelope: TelemetryEnvelope) =>
  envelope.data?.baseType === "RemoteDependencyData" && envelope.data.baseData
    ? [envelope.data.baseData]
    : [];

const getRequestRemoteDependencies = (request: CapturedRequest) => {
  const parsedBatch = parseBatch(request.body);

  return parsedBatch.success
    ? parsedBatch.data.flatMap(extractRemoteDependency)
    : [];
};

const readBuffer = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const collectTelemetryRequest = async (
  requests: CapturedRequest[],
  request: IncomingMessage,
  response: ServerResponse,
) => {
  requests.push({
    body: decodeRequestBody(
      request.headers["content-encoding"],
      await readBuffer(request),
    ),
    path: request.url ?? "/",
  });

  response.writeHead(200, { "content-type": "application/json" });
  response.end(acceptedTelemetryResponse);
};

const createTelemetryRequestHandler =
  (requests: CapturedRequest[]) =>
  (request: IncomingMessage, response: ServerResponse) => {
    void collectTelemetryRequest(requests, request, response).catch(
      (error: unknown) => {
        response.destroy(error instanceof Error ? error : undefined);
      },
    );
  };

const closeServer = (server: ReturnType<typeof createServer>) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const loadCollectorCertificate = async (): Promise<CollectorCertificate> => {
  // Static PEM fixtures keep these tests self-contained and avoid an OpenSSL
  // runtime dependency on CI or contributor machines.
  const [certificate, privateKey] = await Promise.all([
    readFile(collectorCertificatePath),
    readFile(collectorPrivateKeyPath),
  ]);

  return {
    certificate,
    privateKey,
  };
};

export const startTelemetryCollector =
  async (): Promise<TelemetryCollector> => {
    const requests: CapturedRequest[] = [];
    const collectorCertificate = await loadCollectorCertificate();

    const server = createServer(
      {
        cert: collectorCertificate.certificate,
        key: collectorCertificate.privateKey,
      },
      createTelemetryRequestHandler(requests),
    );

    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("The telemetry collector did not bind to a TCP port.");
    }

    const collectorOrigin = `https://${address.address}:${address.port}`;

    const getRemoteDependencies = () =>
      requests.flatMap(getRequestRemoteDependencies);

    const waitForRemoteDependencies = async (
      predicate: (dependency: RemoteDependencyData) => boolean,
    ) => {
      for (let attempt = 0; attempt < 150; attempt += 1) {
        const matchingDependencies = getRemoteDependencies().filter(predicate);

        if (matchingDependencies.length > 0) {
          return matchingDependencies;
        }

        await delay(200);
      }

      throw new Error(
        `Expected dependency telemetry but captured:\n${JSON.stringify(
          requests,
          null,
          2,
        )}`,
      );
    };

    return {
      caCertificatePath: collectorCertificatePath,
      close: () => closeServer(server),
      connectionString: [
        "InstrumentationKey=00000000-0000-0000-0000-000000000000",
        `IngestionEndpoint=${collectorOrigin}`,
        `LiveEndpoint=${collectorOrigin}`,
      ].join(";"),
      getRemoteDependencies,
      waitForRemoteDependencies,
    };
  };

const mergeNodeOptions = (existingNodeOptions: string | undefined) =>
  [existingNodeOptions, "--import=tsx", `--import=${preloadModulePath}`]
    .filter((value) => value && value.length > 0)
    .join(" ");

export const runDependencyScenario = async (
  scenario: Scenario,
  env: NodeJS.ProcessEnv,
  collectorCertificatePath: string,
) => {
  await runProcess(
    process.execPath,
    [scenarioScriptPath, scenario],
    `The ${scenario} scenario failed.`,
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        ...env,
        NODE_EXTRA_CA_CERTS: collectorCertificatePath,
        NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS),
      },
    },
  );
};

export const createStorageConnectionString = (host: string, port: number) =>
  [
    "DefaultEndpointsProtocol=http",
    "AccountName=devstoreaccount1",
    `AccountKey=${azuriteAccountKey}`,
    `BlobEndpoint=http://${host}:${port}/devstoreaccount1`,
  ].join(";");

export const createRunId = () => randomUUID().replaceAll("-", "").slice(0, 24);
