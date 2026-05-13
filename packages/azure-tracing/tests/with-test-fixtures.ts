/**
 * Provide disposable per-test resources on top of the shared backend topology.
 */
import { randomUUID } from "node:crypto";

import { CosmosClient } from "@azure/cosmos";
import { createClient } from "redis";
import { test as base } from "vitest";

import {
  buildAzureMonitorConnectionString,
  requiredEnv,
} from "./support/backend-env.js";
import {
  createBackendStubClient,
  type BackendStubClient,
} from "./support/backend-stub-client.js";

interface ScenarioEnv {
  APPLICATIONINSIGHTS_SDKSTATS_DISABLED: string;
  AZURE_LOG_LEVEL: string;
  AZURE_TRACING_TEST_CONNECTION_STRING: string;
  AZURE_TRACING_TEST_COSMOS_ENDPOINT: string;
  AZURE_TRACING_TEST_COSMOS_KEY: string;
  AZURE_TRACING_TEST_INGESTION_ENDPOINT: string;
  AZURE_TRACING_TEST_OUTBOUND_URL: string;
  AZURE_TRACING_TEST_REDIS_URL: string;
  NODE_TLS_REJECT_UNAUTHORIZED: string;
  OTEL_BLRP_SCHEDULE_DELAY: string;
  OTEL_BSP_SCHEDULE_DELAY: string;
}

const readSharedEnv = () => {
  const stubBaseUrl = requiredEnv("AZURE_TRACING_TEST_STUB_BASE_URL");
  const ingestionEndpoint = requiredEnv("AZURE_TRACING_TEST_INGESTION_ENDPOINT");
  const outboundUrl = requiredEnv("AZURE_TRACING_TEST_OUTBOUND_URL");
  const redisUrl = requiredEnv("AZURE_TRACING_TEST_REDIS_URL");
  const cosmosEndpoint = requiredEnv("AZURE_TRACING_TEST_COSMOS_ENDPOINT");
  const cosmosKey = requiredEnv("AZURE_TRACING_TEST_COSMOS_KEY");

  return {
    cosmosEndpoint,
    cosmosKey,
    ingestionEndpoint,
    outboundUrl,
    redisUrl,
    stubBaseUrl,
  };
};

const buildReplacementPairs = () => {
  const { cosmosEndpoint, redisUrl, stubBaseUrl } = readSharedEnv();
  const redisUrlObject = new URL(redisUrl);
  const cosmosEndpointObject = new URL(cosmosEndpoint);
  const stubUrlObject = new URL(stubBaseUrl);

  return [
    [buildAzureMonitorConnectionString(stubBaseUrl), "<azure-monitor-connection-string>"],
    [stubBaseUrl, "https://<azure-monitor-stub>"],
    [stubUrlObject.host, "<azure-monitor-stub-host>"],
    [stubUrlObject.hostname, "<azure-monitor-stub-host>"],
    [redisUrl, "redis://<redis>"],
    [redisUrlObject.host, "<redis-host>"],
    [redisUrlObject.hostname, "<redis-host>"],
    [cosmosEndpoint, "http://<cosmos-emulator>"],
    [cosmosEndpointObject.host, "<cosmos-emulator-host>"],
    [cosmosEndpointObject.hostname, "<cosmos-emulator-host>"],
  ] satisfies readonly (readonly [string, string])[];
};

const createRedisCleanupClient = () =>
  createClient({ url: readSharedEnv().redisUrl });

const createCosmosCleanupClient = () =>
  new CosmosClient({
    connectionPolicy: { enableEndpointDiscovery: false },
    endpoint: readSharedEnv().cosmosEndpoint,
    key: readSharedEnv().cosmosKey,
  });

const isCosmosNotFoundError = (error: unknown) => {
  if (error instanceof Error && /not found/i.test(error.message)) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = Reflect.get(error, "statusCode");
  return typeof candidate === "number" && candidate === 404;
};

export const backendTest = base.extend<{
  backendStub: BackendStubClient;
  cosmosDatabaseId: string;
  replacements: readonly (readonly [string, string])[];
  redisNamespace: string;
  scenarioEnv: ScenarioEnv;
}>({
  backendStub: async ({}, use) => {
    const backendStub = createBackendStubClient(readSharedEnv().stubBaseUrl);
    await backendStub.reset();

    try {
      await use(backendStub);
    } finally {
      await backendStub.reset();
    }
  },
  cosmosDatabaseId: async ({}, use) => {
    const cosmosDatabaseId = `azure-tracing-test-${randomUUID()}`;

    try {
      await use(cosmosDatabaseId);
    } finally {
      const cosmosClient = createCosmosCleanupClient();

      try {
        await cosmosClient.database(cosmosDatabaseId).delete();
      } catch (error) {
        if (!isCosmosNotFoundError(error)) {
          throw error;
        }
      }
    }
  },
  redisNamespace: async ({}, use) => {
    const redisNamespace = `azure-tracing-test:${randomUUID()}`;
    const redisClient = createRedisCleanupClient();
    await redisClient.connect();

    try {
      await use(redisNamespace);
    } finally {
      const keys: string[] = [];

      for await (const key of redisClient.scanIterator({
        MATCH: `${redisNamespace}:*`,
      })) {
        keys.push(String(key));
      }

      if (keys.length > 0) {
        await redisClient.sendCommand(["DEL", ...keys]);
      }

      await redisClient.quit();
    }
  },
  replacements: async ({}, use) => {
    await use(buildReplacementPairs());
  },
  scenarioEnv: async ({}, use) => {
    const { cosmosEndpoint, cosmosKey, ingestionEndpoint, outboundUrl, redisUrl } =
      readSharedEnv();

    await use({
      APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
      AZURE_LOG_LEVEL: "error",
      AZURE_TRACING_TEST_CONNECTION_STRING:
        buildAzureMonitorConnectionString(ingestionEndpoint),
      AZURE_TRACING_TEST_COSMOS_ENDPOINT: cosmosEndpoint,
      AZURE_TRACING_TEST_COSMOS_KEY: cosmosKey,
      AZURE_TRACING_TEST_INGESTION_ENDPOINT: ingestionEndpoint,
      AZURE_TRACING_TEST_OUTBOUND_URL: outboundUrl,
      AZURE_TRACING_TEST_REDIS_URL: redisUrl,
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      OTEL_BLRP_SCHEDULE_DELAY: "1000",
      OTEL_BSP_SCHEDULE_DELAY: "1000",
    });
  },
});
