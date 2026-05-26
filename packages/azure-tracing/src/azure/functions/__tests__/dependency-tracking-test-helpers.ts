/**
 * Shared helpers for dependency-tracking integration tests that preload the
 * Azure tracing entrypoint and assert exported Application Insights envelopes.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { z } from "zod";

const packageRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const preloadModulePath = fileURLToPath(
  new URL("../index.mts", import.meta.url),
);
const scenarioScriptPath = fileURLToPath(
  new URL("./fixtures/run-dependency-scenario.ts", import.meta.url),
);
const collectorCertificatePath = new URL(
  "./fixtures/telemetry-collector.cert.pem",
  import.meta.url,
);
const collectorPrivateKeyPath = new URL(
  "./fixtures/telemetry-collector.key.pem",
  import.meta.url,
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

export const dependencyTestTimeoutMs = 300_000;

export const cosmosEmulatorKey =
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

const getHeaderValue = (value: readonly string[] | string | undefined) =>
  Array.isArray(value) ? value[0] : value;

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
    return telemetryBatchSchema.safeParse(JSON.parse(body));
  } catch {
    return telemetryBatchSchema.safeParse(undefined);
  }
};

export const startTelemetryCollector =
  async (): Promise<TelemetryCollector> => {
    const requests: CapturedRequest[] = [];
    const [certificate, privateKey] = await Promise.all([
      readFile(collectorCertificatePath),
      readFile(collectorPrivateKeyPath),
    ]);

    const server = createServer(
      { cert: certificate, key: privateKey },
      (request, response) => {
        const chunks: Buffer[] = [];

        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        request.on("end", () => {
          requests.push({
            body: decodeRequestBody(
              request.headers["content-encoding"],
              Buffer.concat(chunks),
            ),
            path: request.url ?? "/",
          });

          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({ errors: [], itemsAccepted: 1, itemsReceived: 1 }),
          );
        });
      },
    );

    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("The telemetry collector did not bind to a TCP port.");
    }

    const collectorOrigin = `https://${address.address}:${address.port}`;

    const getRemoteDependencies = () =>
      requests.flatMap((request) => {
        const parsedBatch = parseBatch(request.body);

        if (!parsedBatch.success) {
          return [];
        }

        return parsedBatch.data.flatMap((envelope) => {
          if (envelope.data?.baseType !== "RemoteDependencyData") {
            return [];
          }

          return envelope.data.baseData ? [envelope.data.baseData] : [];
        });
      });

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
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        }),
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
  scenario: "cosmos" | "redis" | "storage",
  env: NodeJS.ProcessEnv,
) => {
  const child = spawn(process.execPath, [scenarioScriptPath, scenario], {
    cwd: packageRoot,
    env: {
      ...process.env,
      ...env,
      NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS),
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderrChunks: Buffer[] = [];
  const stdoutChunks: Buffer[] = [];

  child.stderr.on("data", (chunk) => {
    stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const [exitCode, signal] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(
      [
        `The ${scenario} scenario failed.`,
        `Exit code: ${String(exitCode)}`,
        `Signal: ${String(signal)}`,
        `STDOUT:\n${Buffer.concat(stdoutChunks).toString("utf8")}`,
        `STDERR:\n${Buffer.concat(stderrChunks).toString("utf8")}`,
      ].join("\n\n"),
    );
  }
};

export const createStorageConnectionString = (host: string, port: number) =>
  [
    "DefaultEndpointsProtocol=http",
    "AccountName=devstoreaccount1",
    `AccountKey=${azuriteAccountKey}`,
    `BlobEndpoint=http://${host}:${port}/devstoreaccount1`,
  ].join(";");

export const createRunId = () => randomUUID().replaceAll("-", "").slice(0, 24);
