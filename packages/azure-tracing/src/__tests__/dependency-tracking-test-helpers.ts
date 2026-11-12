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

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
/**
 * Preload entrypoint for Azure Functions runtimes, which cannot call
 * `initAzureMonitor` themselves.
 */
export const functionsPreloadModulePath = fileURLToPath(
  new URL("../azure/functions/index.mts", import.meta.url),
);
/**
 * Preload entrypoint for standalone Node.js applications (Container Apps, App
 * Services) that instrument themselves through `initAzureMonitor`.
 */
export const standalonePreloadModulePath = fileURLToPath(
  new URL("./fixtures/standalone-preload.mts", import.meta.url),
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

const telemetryBaseDataSchema = z
  .object({
    data: z.string().optional(),
    name: z.string().optional(),
    responseCode: z.string().optional(),
    target: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

const telemetryEnvelopeSchema = z
  .object({
    data: z
      .object({
        baseData: telemetryBaseDataSchema.optional(),
        baseType: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const telemetryBatchSchema = z.array(telemetryEnvelopeSchema);

export type TelemetryBaseData = z.infer<typeof telemetryBaseDataSchema>;
export interface TelemetryCollector {
  readonly caCertificatePath: string;
  close: () => Promise<void>;
  readonly connectionString: string;
  getCapturedPaths: () => readonly string[];
  getRemoteDependencies: () => TelemetryBaseData[];
  getRequestTelemetries: () => TelemetryBaseData[];
  waitForCapturedPath: (
    predicate: (path: string) => boolean,
  ) => Promise<string>;
  waitForRemoteDependencies: (
    predicate: (dependency: TelemetryBaseData) => boolean,
  ) => Promise<readonly TelemetryBaseData[]>;
  waitForRequestTelemetries: (
    predicate: (telemetry: TelemetryBaseData) => boolean,
  ) => Promise<readonly TelemetryBaseData[]>;
}

interface CapturedRequest {
  readonly body: string;
  readonly path: string;
}

interface CollectorCertificate {
  readonly certificate: Buffer;
  readonly privateKey: Buffer;
}

type Scenario = "cosmos" | "fastify" | "redis" | "storage";

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

export const runProcess = async (
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

const extractBaseData = (baseType: string) => (envelope: TelemetryEnvelope) =>
  envelope.data?.baseType === baseType && envelope.data.baseData
    ? [envelope.data.baseData]
    : [];

const getRequestBaseData = (request: CapturedRequest, baseType: string) => {
  const parsedBatch = parseBatch(request.body);

  return parsedBatch.success
    ? parsedBatch.data.flatMap(extractBaseData(baseType))
    : [];
};

const readBuffer = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const isLiveMetricsRequest = (path: string) =>
  path.startsWith("/QuickPulseService.svc/");

const collectTelemetryRequest = async (
  requests: CapturedRequest[],
  request: IncomingMessage,
  response: ServerResponse,
) => {
  const path = request.url ?? "/";

  requests.push({
    body: decodeRequestBody(
      request.headers["content-encoding"],
      await readBuffer(request),
    ),
    path,
  });

  // Live Metrics clients ping the service until it reports a subscription and
  // then publish metrics on the post endpoint. Answering with the subscribed
  // header keeps the handshake going; the body stays empty so the client keeps
  // using its default collection configuration.
  if (isLiveMetricsRequest(path)) {
    response.writeHead(200, { "x-ms-qps-subscribed": "true" });
    response.end();
    return;
  }

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
      requests.flatMap((request) =>
        getRequestBaseData(request, "RemoteDependencyData"),
      );

    const getRequestTelemetries = () =>
      requests.flatMap((request) => getRequestBaseData(request, "RequestData"));

    const waitForMatch = async <T>(
      findMatches: () => readonly T[],
      predicate: (value: T) => boolean,
      describeFailure: (captured: readonly CapturedRequest[]) => string,
    ) => {
      for (let attempt = 0; attempt < 150; attempt += 1) {
        const matchingValues = findMatches().filter(predicate);

        if (matchingValues.length > 0) {
          return matchingValues;
        }

        await delay(200);
      }

      throw new Error(describeFailure(requests));
    };

    const formatCapturedRequests = (captured: readonly CapturedRequest[]) =>
      JSON.stringify(
        captured.map(({ body, path }) => ({ body, path })),
        null,
        2,
      );

    return {
      caCertificatePath: collectorCertificatePath,
      close: () => closeServer(server),
      connectionString: [
        "InstrumentationKey=00000000-0000-0000-0000-000000000000",
        `IngestionEndpoint=${collectorOrigin}`,
        `LiveEndpoint=${collectorOrigin}`,
      ].join(";"),
      getCapturedPaths: () => requests.map(({ path }) => path),
      getRemoteDependencies,
      getRequestTelemetries,
      waitForCapturedPath: async (predicate) => {
        const [path] = await waitForMatch(
          () => requests.map((request) => request.path),
          predicate,
          (captured) =>
            `Expected a captured request but received:\n${formatCapturedRequests(captured)}`,
        );

        return path;
      },
      waitForRemoteDependencies: (predicate) =>
        waitForMatch(
          getRemoteDependencies,
          predicate,
          (captured) =>
            `Expected dependency telemetry but captured:\n${formatCapturedRequests(captured)}`,
        ),
      waitForRequestTelemetries: (predicate) =>
        waitForMatch(
          getRequestTelemetries,
          predicate,
          (captured) =>
            `Expected request telemetry but captured:\n${formatCapturedRequests(captured)}`,
        ),
    };
  };

const mergeNodeOptions = (
  existingNodeOptions: string | undefined,
  preloadModulePath: string,
) =>
  [existingNodeOptions, "--import=tsx", `--import=${preloadModulePath}`]
    .filter((value) => value && value.length > 0)
    .join(" ");

export const runDependencyScenario = async (
  scenario: Scenario,
  env: NodeJS.ProcessEnv,
  collectorCertificatePath: string,
  preloadModulePath: string = functionsPreloadModulePath,
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
        NODE_OPTIONS: mergeNodeOptions(
          process.env.NODE_OPTIONS,
          preloadModulePath,
        ),
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
