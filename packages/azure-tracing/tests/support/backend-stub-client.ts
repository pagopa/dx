/**
 * Read and reset the local HTTPS stub that stands in for Azure Monitor ingestion.
 */
import { setTimeout as delay } from "node:timers/promises";

import type { CapturedHttpRequest, TelemetryEnvelope } from "./telemetry.js";

interface WaitOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export interface BackendStubClient {
  listOutboundRequests: () => Promise<readonly CapturedHttpRequest[]>;
  listTelemetry: () => Promise<readonly TelemetryEnvelope[]>;
  reset: () => Promise<void>;
  waitForTelemetry: (
    predicate: (items: readonly TelemetryEnvelope[]) => boolean,
    options?: WaitOptions,
  ) => Promise<readonly TelemetryEnvelope[]>;
}

const fetchJson = async <T>(url: URL, init?: RequestInit) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Unexpected ${response.status} from ${url.pathname}`);
  }

  return (await response.json()) as T;
};

export const createBackendStubClient = (baseUrl: string): BackendStubClient => {
  const telemetryUrl = new URL("/__admin/telemetry", baseUrl);
  const outboundRequestsUrl = new URL("/__admin/outbound-requests", baseUrl);

  const listTelemetry = () =>
    fetchJson<readonly TelemetryEnvelope[]>(telemetryUrl);

  const listOutboundRequests = () =>
    fetchJson<readonly CapturedHttpRequest[]>(outboundRequestsUrl);

  const reset = async () => {
    await Promise.all([
      fetchJson<{ ok: true }>(telemetryUrl, { method: "DELETE" }),
      fetchJson<{ ok: true }>(outboundRequestsUrl, { method: "DELETE" }),
    ]);
  };

  const waitForTelemetry = async (
    predicate: (items: readonly TelemetryEnvelope[]) => boolean,
    options: WaitOptions = {},
  ) => {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 250;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
      const items = await listTelemetry();

      if (predicate(items)) {
        return items;
      }

      await delay(intervalMs);
    }

    throw new Error("Timed out while waiting for telemetry to reach the stub");
  };

  return {
    listOutboundRequests,
    listTelemetry,
    reset,
    waitForTelemetry,
  };
};
