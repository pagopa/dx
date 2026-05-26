import { CosmosClient } from "@azure/cosmos";
import { shutdownAzureMonitor } from "@azure/monitor-opentelemetry";
import { BlobServiceClient } from "@azure/storage-blob";
import { context, trace } from "@opentelemetry/api";
/**
 * Child-process fixture that performs real Cosmos DB, Redis, and Blob Storage
 * operations after the package preload entrypoint has initialized telemetry.
 */
import { Readable } from "node:stream";
import { createClient } from "redis";
import { z } from "zod";

const scenarioSchema = z.enum(["cosmos", "redis", "storage"]);

const cosmosEnvSchema = z.object({
  COSMOS_CONTAINER_ID: z.string().min(1),
  COSMOS_DATABASE_ID: z.string().min(1),
  COSMOS_ENDPOINT: z.string().url(),
  COSMOS_ITEM_ID: z.string().min(1),
  COSMOS_KEY: z.string().min(1),
});

const redisEnvSchema = z.object({
  REDIS_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  REDIS_VALUE: z.string().min(1),
});

const storageEnvSchema = z.object({
  STORAGE_BLOB_NAME: z.string().min(1),
  STORAGE_CONNECTION_STRING: z.string().min(1),
  STORAGE_CONTAINER_NAME: z.string().min(1),
});

const readScenario = () => {
  const result = scenarioSchema.safeParse(process.argv[2]);

  if (!result.success) {
    throw new Error(
      `Unsupported dependency scenario: ${process.argv[2] ?? ""}`,
    );
  }

  return result.data;
};

const readBuffer = async (stream: NodeJS.ReadableStream | undefined) => {
  if (!stream) {
    throw new Error("The blob download did not expose a readable stream.");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const withScenarioSpan = async <T>(
  scenario: string,
  action: () => Promise<T>,
) => {
  const tracer = trace.getTracer("azure-tracing-dependency-integration");
  const span = tracer.startSpan(`${scenario}.scenario`);

  try {
    return await context.with(trace.setSpan(context.active(), span), action);
  } finally {
    span.end();
  }
};

const runCosmosScenario = async () => {
  const env = cosmosEnvSchema.parse(process.env);
  const client = new CosmosClient({
    connectionPolicy: { enableEndpointDiscovery: false },
    endpoint: env.COSMOS_ENDPOINT,
    key: env.COSMOS_KEY,
  });

  const { database } = await client.databases.createIfNotExists({
    id: env.COSMOS_DATABASE_ID,
  });

  const { container } = await database.containers.createIfNotExists({
    id: env.COSMOS_CONTAINER_ID,
    partitionKey: { paths: ["/id"] },
  });

  await container.items.upsert({
    id: env.COSMOS_ITEM_ID,
    kind: "integration-test",
    message: "dependency tracking",
  });

  const { resource } = await container
    .item(env.COSMOS_ITEM_ID, env.COSMOS_ITEM_ID)
    .read();

  if (!resource || resource.id !== env.COSMOS_ITEM_ID) {
    throw new Error(
      "The Cosmos DB scenario did not read back the expected item.",
    );
  }
};

const runRedisScenario = async () => {
  const env = redisEnvSchema.parse(process.env);
  const client = createClient({ url: env.REDIS_URL });

  await client.connect();

  try {
    await client.set(env.REDIS_KEY, env.REDIS_VALUE);
    const value = await client.get(env.REDIS_KEY);

    if (value !== env.REDIS_VALUE) {
      throw new Error(
        "The Redis scenario did not read back the expected value.",
      );
    }
  } finally {
    if (client.isOpen) {
      await client.quit();
    }
  }
};

const runStorageScenario = async () => {
  const env = storageEnvSchema.parse(process.env);
  const serviceClient = BlobServiceClient.fromConnectionString(
    env.STORAGE_CONNECTION_STRING,
  );
  const containerClient = serviceClient.getContainerClient(
    env.STORAGE_CONTAINER_NAME,
  );

  await containerClient.createIfNotExists();

  const blobClient = containerClient.getBlockBlobClient(env.STORAGE_BLOB_NAME);
  const payload = Buffer.from("dependency-tracking");

  await blobClient.uploadData(payload);

  const download = await blobClient.download();
  const downloadedPayload = await readBuffer(download.readableStreamBody);

  if (!downloadedPayload.equals(payload)) {
    throw new Error(
      "The Blob Storage scenario did not read back the uploaded payload.",
    );
  }
};

const main = async () => {
  const scenario = readScenario();

  try {
    if (scenario === "cosmos") {
      await withScenarioSpan("cosmos", runCosmosScenario);
      return;
    }

    if (scenario === "redis") {
      await withScenarioSpan("redis", runRedisScenario);
      return;
    }

    await withScenarioSpan("storage", runStorageScenario);
  } finally {
    await shutdownAzureMonitor();
  }
};

await main();
