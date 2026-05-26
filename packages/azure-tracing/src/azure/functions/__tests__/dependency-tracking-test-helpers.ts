/**
 * Shared helpers for dependency-tracking integration tests that preload the
 * Azure tracing entrypoint and assert exported Application Insights envelopes.
 */
import { execFile, type ExecFileOptions } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse } from "node:http";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

interface GeneratedCertificate {
  readonly caCertificatePath: string;
  readonly certificate: Buffer;
  readonly cleanup: () => Promise<void>;
  readonly privateKey: Buffer;
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

const closeCollector = async (
  server: ReturnType<typeof createServer>,
  cleanupCertificate: () => Promise<void>,
) => {
  const errors = (
    await Promise.allSettled([closeServer(server), cleanupCertificate()])
  ).flatMap((result) => (result.status === "rejected" ? [result.reason] : []));

  if (errors.length === 0) {
    return;
  }

  throw errors.length === 1
    ? errors[0]
    : new AggregateError(
        errors,
        "Failed to stop the telemetry collector cleanly.",
      );
};

const generateCollectorCertificate =
  async (): Promise<GeneratedCertificate> => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "azure-tracing-collector-"),
    );
    const caCertificatePath = join(
      temporaryDirectory,
      "telemetry-collector.pem",
    );
    const privateKeyPath = join(
      temporaryDirectory,
      "telemetry-collector.key.pem",
    );

    await runProcess(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-sha256",
        "-days",
        "1",
        "-subj",
        "/CN=127.0.0.1",
        "-addext",
        "subjectAltName=IP:127.0.0.1,DNS:localhost",
        "-keyout",
        privateKeyPath,
        "-out",
        caCertificatePath,
      ],
      "openssl failed while generating the telemetry collector certificate.",
    );

    const [certificate, privateKey] = await Promise.all([
      readFile(caCertificatePath),
      readFile(privateKeyPath),
    ]);

    return {
      caCertificatePath,
      certificate,
      cleanup: () => rm(temporaryDirectory, { force: true, recursive: true }),
      privateKey,
    };
  };

export const startTelemetryCollector =
  async (): Promise<TelemetryCollector> => {
    const requests: CapturedRequest[] = [];
    const generatedCertificate = await generateCollectorCertificate();

    const server = createServer(
      {
        cert: generatedCertificate.certificate,
        key: generatedCertificate.privateKey,
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
      caCertificatePath: generatedCertificate.caCertificatePath,
      close: () => closeCollector(server, generatedCertificate.cleanup),
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
