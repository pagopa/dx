// Exercises job identification, pagination and step timestamp validation.

import assert from "node:assert/strict";
import { test } from "vitest";

import { fetchTimeline } from "./timeline.js";

const config = {
  apiUrl: "https://api.github.com",
  now: Date.parse("2026-01-01T10:03:00Z"),
  repository: "pagopa/dx",
  runAttempt: "2",
  runId: "42",
  runnerName: "runner-1",
  token: "test-token",
};

function response(jobs, status = 200) {
  return { json: async () => ({ jobs }), ok: status === 200, status };
}

test("selects only the current runner and converts completed and running steps", async () => {
  const timeline = await fetchTimeline(config, async (url, options) => {
    assert.equal(
      url.pathname,
      "/repos/pagopa/dx/actions/runs/42/attempts/2/jobs",
    );
    assert.equal(options.headers.Authorization, "Bearer test-token");
    return response([
      { runner_name: "runner-1", status: "completed", steps: [] },
      {
        runner_name: "runner-1",
        status: "in_progress",
        steps: [
          {
            completed_at: "2026-01-01T10:01:00Z",
            name: "Checkout",
            started_at: "2026-01-01T10:00:00Z",
          },
          {
            completed_at: null,
            name: "Build",
            started_at: "2026-01-01T10:01:00Z",
          },
          { completed_at: null, name: "Future", started_at: null },
        ],
      },
    ]);
  });
  assert.deepEqual(timeline, [
    { end: 1767261660, name: "Checkout", start: 1767261600 },
    { end: 1767261780, name: "Build", start: 1767261660 },
  ]);
});

test("finds the current job on a later page", async () => {
  const pages = [];
  const timeline = await fetchTimeline(config, async (url) => {
    pages.push(url.searchParams.get("page"));
    return pages.length === 1
      ? response(Array.from({ length: 100 }, () => ({ runner_name: "other" })))
      : response([
          { runner_name: "runner-1", status: "in_progress", steps: [] },
        ]);
  });
  assert.deepEqual(pages, ["1", "2"]);
  assert.deepEqual(timeline, []);
});

test("rejects inaccessible, ambiguous or malformed job data", async () => {
  await assert.rejects(
    fetchTimeline(config, async () => response([], 403)),
    /HTTP 403/,
  );
  const job = { runner_name: "runner-1", status: "in_progress", steps: [] };
  await assert.rejects(
    fetchTimeline(config, async () => response([job, job])),
    /uniquely/,
  );
  await assert.rejects(
    fetchTimeline(config, async () =>
      response([{ ...job, steps: [{ name: "Bad", started_at: "invalid" }] }]),
    ),
    /invalid step/,
  );
  await assert.rejects(
    fetchTimeline({ ...config, apiUrl: "http://example.com" }),
    /Invalid GitHub API URL/,
  );
});
