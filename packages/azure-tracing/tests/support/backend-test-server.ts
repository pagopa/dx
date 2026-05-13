/**
 * Run one HTTPS stub that captures both Azure Monitor ingestion and outbound probes.
 */
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:https";

import type { CapturedHttpRequest, TelemetryEnvelope } from "./telemetry.js";

interface BackendTestServer {
  baseUrl: string;
  ingestionEndpoint: string;
  outboundUrl: string;
  stop: () => Promise<void>;
}

const readRequestBody = async (request: IncomingMessage) =>
  await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });

const asAddressInfo = (server: Server) => {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected the backend test server to listen on a TCP port");
  }

  return address;
};

const okJson = (response: ServerResponse, body: unknown) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const parseTelemetryItems = (body: string) => {
  const parsedBody = JSON.parse(body);

  if (!Array.isArray(parsedBody)) {
    throw new Error("Expected Azure Monitor track payload to be an array");
  }

  return parsedBody.filter(
    (item): item is TelemetryEnvelope =>
      typeof item === "object" && item !== null,
  );
};

export const startBackendTestServer = async (): Promise<BackendTestServer> => {
  const [certificate, key] = await Promise.all([
    readFile(new URL("./ingestion-stub-cert.pem", import.meta.url), "utf8"),
    readFile(new URL("./ingestion-stub-key.pem", import.meta.url), "utf8"),
  ]);

  let telemetry: TelemetryEnvelope[] = [];
  let outboundRequests: CapturedHttpRequest[] = [];

  const server = createServer({ cert: certificate, key }, async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", "https://127.0.0.1");

    if (req.method === "GET" && requestUrl.pathname === "/__admin/telemetry") {
      okJson(res, telemetry);
      return;
    }

    if (
      req.method === "DELETE" &&
      requestUrl.pathname === "/__admin/telemetry"
    ) {
      telemetry = [];
      okJson(res, { ok: true });
      return;
    }

    if (
      req.method === "GET" &&
      requestUrl.pathname === "/__admin/outbound-requests"
    ) {
      okJson(res, outboundRequests);
      return;
    }

    if (
      req.method === "DELETE" &&
      requestUrl.pathname === "/__admin/outbound-requests"
    ) {
      outboundRequests = [];
      okJson(res, { ok: true });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/outbound/ping") {
      outboundRequests.push({
        body: await readRequestBody(req),
        headers: req.headers,
        method: req.method,
        url: requestUrl.pathname,
      });
      okJson(res, { ok: true });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/v2.1/track") {
      const body = await readRequestBody(req);
      const items = parseTelemetryItems(body);
      telemetry = telemetry.concat(items);
      okJson(res, {
        errors: [],
        itemsAccepted: items.length,
        itemsReceived: items.length,
      });
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = asAddressInfo(server);
  const baseUrl = `https://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    ingestionEndpoint: baseUrl,
    outboundUrl: `${baseUrl}/outbound/ping`,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
};
