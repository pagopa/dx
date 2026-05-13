/**
 * Start Redis and the Cosmos emulator once for the whole backend test process.
 */
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cosmosEmulatorKey } from "./backend-env.js";

interface SharedTestcontainersTopology {
  cosmosEndpoint: string;
  cosmosKey: string;
  redisUrl: string;
  stop: () => Promise<void>;
}

const ensureDockerConfig = async () => {
  if (process.env.DOCKER_CONFIG) {
    return process.env.DOCKER_CONFIG;
  }

  const dockerConfigDirectory = join(
    tmpdir(),
    "azure-tracing-testcontainers-docker-config",
  );
  await mkdir(dockerConfigDirectory, { recursive: true });
  process.env.DOCKER_CONFIG = dockerConfigDirectory;
  return dockerConfigDirectory;
};

const warmCosmosEmulator = async (cosmosEndpoint: string) => {
  const { CosmosClient } = await import("@azure/cosmos");
  const warmupDatabaseId = `warmup-${randomUUID()}`;

  const cosmosClient = new CosmosClient({
    connectionPolicy: { enableEndpointDiscovery: false },
    endpoint: cosmosEndpoint,
    key: cosmosEmulatorKey,
  });

  const { database } = await cosmosClient.databases.create({
    id: warmupDatabaseId,
  });

  try {
    const { container } = await database.containers.create({
      id: "warmup-items",
      partitionKey: { paths: ["/pk"] },
    });

    await container.items.upsert({ id: "warmup-item", pk: "warmup" });
    await container.items.query("SELECT * FROM c").fetchAll();
  } finally {
    await database.delete();
  }
};

export const startSharedTestcontainers =
  async (): Promise<SharedTestcontainersTopology> => {
    await ensureDockerConfig();

    const [{ RedisContainer }, { GenericContainer, Wait }] = await Promise.all([
      import("@testcontainers/redis"),
      import("testcontainers"),
    ]);

    const redisContainer = await new RedisContainer("redis:7-alpine").start();
    const cosmosContainer = await new GenericContainer(
      "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview",
    )
      .withExposedPorts(8080, 8081)
      .withWaitStrategy(Wait.forHttp("/ready", 8080).forStatusCode(200))
      .start();

    const cosmosEndpoint = `http://${cosmosContainer.getHost()}:${cosmosContainer.getMappedPort(8081)}`;

    await warmCosmosEmulator(cosmosEndpoint);

    return {
      cosmosEndpoint,
      cosmosKey: cosmosEmulatorKey,
      redisUrl: redisContainer.getConnectionUrl(),
      stop: async () => {
        await cosmosContainer.stop();
        await redisContainer.stop();
      },
    };
  };
