/*
Scenario for the packed-package consumer: it performs one Redis round trip and
flushes telemetry before exiting. `@azure/monitor-opentelemetry` is a direct
dependency of `@pagopa/azure-tracing`, so it resolves from the consumer tree.
 */

import { shutdownAzureMonitor } from "@azure/monitor-opentelemetry";
import process from "node:process";
import { createClient } from "redis";

const { REDIS_KEY, REDIS_URL, REDIS_VALUE } = process.env;

if (!REDIS_KEY || !REDIS_URL || !REDIS_VALUE) {
  throw new Error(
    "The consumer scenario requires REDIS_KEY, REDIS_URL and REDIS_VALUE.",
  );
}

const client = createClient({ url: REDIS_URL });

await client.connect();

try {
  await client.set(REDIS_KEY, REDIS_VALUE);
  const value = await client.get(REDIS_KEY);

  if (value !== REDIS_VALUE) {
    throw new Error(
      "The consumer scenario did not read back the expected value.",
    );
  }
} finally {
  if (client.isOpen) {
    await client.close();
  }

  await shutdownAzureMonitor();
}
