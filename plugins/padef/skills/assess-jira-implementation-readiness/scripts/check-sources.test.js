// Exercises the source existence check without network access.
import assert from "node:assert/strict";
import test from "node:test";

import { checkSources } from "./check-sources.js";

function fakeFetch(handlers) {
  return async (url, { method }) => {
    const handler = handlers[url];
    if (handler instanceof Error) {
      throw handler;
    }
    const status = handler?.[method] ?? handler?.default ?? 404;
    return { ok: status >= 200 && status < 300, status };
  };
}

test("passes when every URL is accessible, ignoring fragments and duplicates", async () => {
  const result = await checkSources(
    [
      { url: "https://example.org/a#one" },
      { url: "https://example.org/a#two" },
    ],
    fakeFetch({ "https://example.org/a": { default: 200 } }),
  );
  assert.deepEqual(result, {
    verdict: "Ready",
    sources: [{ url: "https://example.org/a", result: "pass", status: 200 }],
  });
});

test("falls back to GET when HEAD is rejected", async () => {
  const result = await checkSources(
    [{ url: "https://example.org/a" }],
    fakeFetch({ "https://example.org/a": { HEAD: 405, GET: 200 } }),
  );
  assert.equal(result.verdict, "Ready");
});

test("fails on any non-2xx response", async () => {
  for (const status of [401, 403, 404, 500]) {
    const result = await checkSources(
      [{ url: "https://example.org/a" }],
      fakeFetch({ "https://example.org/a": { default: status } }),
    );
    assert.equal(result.verdict, "Not ready");
    assert.equal(result.sources[0].status, status);
  }
});

test("fails on a non-http URL", async () => {
  const result = await checkSources(
    [{ url: "ftp://example.org/a" }],
    fakeFetch({}),
  );
  assert.equal(result.verdict, "Not ready");
});

test("network errors are unverifiable and yield to a failure", async () => {
  const handlers = {
    "https://example.org/a": new Error("getaddrinfo ENOTFOUND"),
    "https://example.org/b": { default: 404 },
  };
  const unverifiable = await checkSources(
    [{ url: "https://example.org/a" }],
    fakeFetch(handlers),
  );
  assert.equal(unverifiable.verdict, "Unable to assess");

  const failed = await checkSources(
    [{ url: "https://example.org/a" }, { url: "https://example.org/b" }],
    fakeFetch(handlers),
  );
  assert.equal(failed.verdict, "Not ready");
});
