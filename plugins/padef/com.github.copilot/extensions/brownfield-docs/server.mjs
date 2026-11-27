// Serves the actor table and same-origin state endpoints on loopback.
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

import { RequestError } from "./request-error.mjs";

const assets = new Map([
  ["", ["index.html", "text/html; charset=utf-8"]],
  ["actors.mjs", ["actors.mjs", "text/javascript; charset=utf-8"]],
  [
    "actor-mentions.mjs",
    ["actor-mentions.mjs", "text/javascript; charset=utf-8"],
  ],
  [
    "github-repository.mjs",
    ["github-repository.mjs", "text/javascript; charset=utf-8"],
  ],
  ["style.css", ["style.css", "text/css; charset=utf-8"]],
]);

export async function startServer(
  actorState,
  currentRepository,
  syncFromCode,
  findUseCases,
) {
  const prefix = `/${randomBytes(24).toString("hex")}/`;
  const server = createServer((request, response) => {
    void handle(request, response).catch((error) => {
      response.writeHead(error instanceof RequestError ? error.status : 500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ error: error.message }));
    });
  });

  async function handle(request, response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'",
    );
    if (
      request.headers.host !== new URL(origin).host ||
      !request.url.startsWith(prefix)
    ) {
      throw new RequestError(404, "Not found.");
    }
    const path = request.url.slice(prefix.length);
    if (request.method === "GET" && assets.has(path)) {
      const [file, type] = assets.get(path);
      const content = await readFile(new URL(file, import.meta.url));
      response.setHeader("Content-Type", type);
      response.end(content);
      return;
    }
    let result;
    if (request.method === "GET" && path === "actors") {
      result = { ...(await actorState.read()), currentRepository };
    } else if (
      request.method === "POST" &&
      (path === "save-actors" ||
        path === "sync-code" ||
        path === "find-use-cases" ||
        path === "generate-document")
    ) {
      if (
        request.headers.origin !== origin ||
        request.headers["x-canvas-request"] !== "1"
      ) {
        throw new RequestError(
          403,
          "Only requests from this canvas are allowed.",
        );
      }
      const input = await readInput(request);
      if (path === "save-actors") {
        result = await actorState.save(input);
      } else if (path === "generate-document") {
        result = await actorState.generateDocument(input);
      } else {
        const submit = path === "sync-code" ? syncFromCode : findUseCases;
        if (!submit)
          throw new RequestError(503, "Investigation is unavailable.");
        if (
          !input ||
          !(input.revision === null || typeof input.revision === "string")
        ) {
          throw new RequestError(400, "A loaded state revision is required.");
        }
        result = { messageId: await submit() };
      }
    } else {
      throw new RequestError(404, "Not found.");
    }
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(result));
  }

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }),
    url: `${origin}${prefix}`,
  };
}

async function readInput(request) {
  if (request.headers["content-type"] !== "application/json") {
    throw new RequestError(415, "Expected application/json.");
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 32000000) throw new RequestError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new RequestError(400, "Invalid JSON.");
    throw error;
  }
}
