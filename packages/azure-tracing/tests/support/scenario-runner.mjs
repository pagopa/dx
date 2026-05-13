/*
Run black-box backend scenarios against the built package exports.
*/
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { trace } from "@opentelemetry/api";
import { shutdownAzureMonitor } from "@azure/monitor-opentelemetry";

import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
import { withOtelContextFunctionV3 } from "@pagopa/azure-tracing/azure-functions/v3";
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";

const telemetryInstrumentationKey = "00000000-0000-0000-0000-000000000000";

const requiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required scenario environment variable: ${name}`);
  }

  return value;
};

const buildConnectionString = () =>
  `InstrumentationKey=${telemetryInstrumentationKey};IngestionEndpoint=${requiredEnv("AZURE_TRACING_TEST_INGESTION_ENDPOINT")}`;

const exportDelayMs = () =>
  Number.parseInt(process.env.AZURE_TRACING_TEST_EXPORT_DELAY_MS ?? "2000", 10);

const waitForExport = async () => {
  await delay(exportDelayMs());
  await shutdownAzureMonitor();
  await delay(500);
};

const initDirectTelemetry = () => {
  initAzureMonitor([], {
    azureMonitorExporterOptions: {
      connectionString: buildConnectionString(),
      disableOfflineStorage: true,
    },
    enableLiveMetrics: false,
    samplingRatio: 1,
    tracesPerSecond: 0,
  });
};

const runIntegrationLiveScenario = async () => {
  initDirectTelemetry();

  const { createClient } = await import("redis");

  const outboundUrl = requiredEnv("AZURE_TRACING_TEST_OUTBOUND_URL");
  const redisNamespace = requiredEnv("AZURE_TRACING_TEST_REDIS_NAMESPACE");
  const redisClient = createClient({
    url: requiredEnv("AZURE_TRACING_TEST_REDIS_URL"),
  });
  const redisKey = `${redisNamespace}:value`;

  await redisClient.connect();

  try {
    await fetch(outboundUrl);
    await redisClient.set(redisKey, "integration-value");
    const redisValue = await redisClient.get(redisKey);

    emitCustomEvent(
      "integration-live-event",
      {
        component: "azure-tracing-tests",
      },
    )("integration-live");

    await waitForExport();

    return {
      outboundUrl,
      redisKey,
      redisValue,
      scenario: "integration-live",
    };
  } finally {
    await redisClient.quit();
  }
};

const runIntegrationCosmosPreloadScenario = async () => {
  const { CosmosClient } = await import("@azure/cosmos");

  const cosmosClient = new CosmosClient({
    connectionPolicy: { enableEndpointDiscovery: false },
    endpoint: requiredEnv("AZURE_TRACING_TEST_COSMOS_ENDPOINT"),
    key: requiredEnv("AZURE_TRACING_TEST_COSMOS_KEY"),
  });
  const databaseId = requiredEnv("AZURE_TRACING_TEST_COSMOS_DATABASE_ID");
  const containerId = requiredEnv("AZURE_TRACING_TEST_COSMOS_CONTAINER_ID");

  const { database } = await cosmosClient.databases.create({ id: databaseId });

  try {
    const { container } = await database.containers.create({
      id: containerId,
      partitionKey: { paths: ["/pk"] },
    });

    await container.items.upsert({
      hello: "world",
      id: `item-${randomUUID()}`,
      pk: "integration",
    });

    const queryResult = await container.items.query("SELECT * FROM c").fetchAll();
    await database.delete();
    await waitForExport();

    return {
      containerId,
      databaseId,
      queryCount: queryResult.resources.length,
      scenario: "integration-cosmos-preload",
    };
  } catch (error) {
    await database.delete();
    throw error;
  }
};

const runFunctionsV4Scenario = async () => {
  initDirectTelemetry();

  const traceparent = requiredEnv("AZURE_TRACING_TEST_TRACEPARENT");
  const tracestate = process.env.AZURE_TRACING_TEST_TRACESTATE ?? null;
  const tracer = trace.getTracer("azure-tracing-tests");
  let preInvocationHandler;

  registerAzureFunctionHooks({
    hook: {
      preInvocation(callback) {
        preInvocationHandler = callback;
        return undefined;
      },
    },
  });

  if (!preInvocationHandler) {
    throw new Error("Azure Functions v4 preInvocation hook was not registered");
  }

  const invocation = {
    functionHandler: async () => {
      await tracer.startActiveSpan("functions-v4-child", async (span) => {
        span.end();
      });
    },
    invocationContext: {
      traceContext: {
        traceParent: traceparent,
        traceState: tracestate,
      },
    },
  };

  preInvocationHandler(invocation);
  await invocation.functionHandler();
  await waitForExport();

  return {
    scenario: "functions-v4",
    spanName: "functions-v4-child",
    traceparent,
    tracestate,
  };
};

const runFunctionsV3Scenario = async () => {
  initDirectTelemetry();

  const traceparent = requiredEnv("AZURE_TRACING_TEST_TRACEPARENT");
  const tracestate = process.env.AZURE_TRACING_TEST_TRACESTATE ?? null;
  const tracer = trace.getTracer("azure-tracing-tests");

  await withOtelContextFunctionV3({
    traceContext: {
      traceparent,
      tracestate,
    },
  })(async () => {
    await tracer.startActiveSpan("functions-v3-child", async (span) => {
      span.end();
    });
  });

  await waitForExport();

  return {
    scenario: "functions-v3",
    spanName: "functions-v3-child",
    traceparent,
    tracestate,
  };
};

const scenario = process.argv[2];

const handlers = new Map([
  ["functions-v3", runFunctionsV3Scenario],
  ["functions-v4", runFunctionsV4Scenario],
  ["integration-cosmos-preload", runIntegrationCosmosPreloadScenario],
  ["integration-live", runIntegrationLiveScenario],
]);

const handler = handlers.get(scenario);

if (!handler) {
  throw new Error(`Unsupported backend test scenario: ${String(scenario)}`);
}

const result = await handler();
console.log(JSON.stringify(result));
