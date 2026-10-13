/**
 * Caller-visible coordination guarantees using real Azure storage orchestration.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStateFixture } from "../../terraform/__tests__/state-fixture.js";
import { repositoryTerraformRunner } from "../../terraform/repository-state.js";
import { blobFaults, credential, destination } from "./blob-fixture.js";
import { clock } from "./clock-fixture.js";

vi.mock("@azure/storage-blob", async () => {
  const { BlobServiceClient } = await import("./blob-fixture.js");
  return { BlobServiceClient };
});
vi.mock("node:timers/promises", async () => {
  const { sleep } = await import("./clock-fixture.js");
  return { setTimeout: sleep };
});

import { AzureRepositoryStateStorage } from "../repository-state-storage.js";

let fixture: Awaited<ReturnType<typeof createStateFixture>>;

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred promise was not initialized.");
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

beforeEach(async () => {
  fixture = await createStateFixture();
});

afterEach(async () => {
  clock.suspended = false;
  vi.useRealTimers();
  await fixture.dispose();
});

describe("repository migration coordination", () => {
  it("refuses a second migration while another caller owns the same destination", async () => {
    const first = new AzureRepositoryStateStorage(credential);
    const second = new AzureRepositoryStateStorage(credential);

    await expect(
      first.withLock(destination, async () =>
        second.withLock(
          destination,
          async () => "unsafe overlapping migration",
        ),
      ),
    ).rejects.toThrow("Cannot acquire the repository migration lock");
  });

  it("allows a new caller to retry after the previous migration fails", async () => {
    const storage = new AzureRepositoryStateStorage(credential);
    await expect(
      storage.withLock(destination, async () => {
        throw new Error("Migration interrupted");
      }),
    ).rejects.toThrow("Migration interrupted");

    await expect(
      new AzureRepositoryStateStorage(credential).withLock(
        destination,
        async () => "retry completed",
      ),
    ).resolves.toBe("retry completed");
  });

  it("allows another process to recover the destination after an unresponsive caller's finite lease expires", async () => {
    vi.useFakeTimers();
    // A frozen process cannot run its renewal timers; Azure time still advances.
    clock.suspended = true;
    const started = createDeferred<undefined>();
    const work = createDeferred<string>();
    const original = new AzureRepositoryStateStorage(credential).withLock(
      destination,
      async () => {
        started.resolve(undefined);
        return work.promise;
      },
    );
    const originalOutcome = original.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await started.promise;
      await vi.advanceTimersByTimeAsync(60_000);

      await expect(
        new AzureRepositoryStateStorage(credential).withLock(
          destination,
          async () => "recovered after process exit",
        ),
      ).resolves.toBe("recovered after process exit");
    } finally {
      work.resolve("orphan cleanup");
      await originalOutcome;
    }
  });

  it("keeps long-running migrations exclusive beyond the initial lease lifetime", async () => {
    vi.useFakeTimers();
    const storage = new AzureRepositoryStateStorage(credential);

    await expect(
      storage.withLock(destination, async () => {
        await vi.advanceTimersByTimeAsync(120_000);
        await expect(
          new AzureRepositoryStateStorage(credential).withLock(
            destination,
            async () => "unsafe concurrent migration",
          ),
        ).rejects.toThrow("Cannot acquire the repository migration lock");
        return "original migration completed";
      }),
    ).resolves.toBe("original migration completed");
  });

  it("terminates running Terraform work when the migration lease is lost", async () => {
    vi.useFakeTimers();
    blobFaults.renewal = new Error("Lease lost");
    const storage = new AzureRepositoryStateStorage(credential);
    const operation = storage.withLock(destination, async (signal) =>
      repositoryTerraformRunner(fixture.repositoryPath, signal)(["hold"]),
    );
    const outcome = operation.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.waitFor(
      async () => {
        await expect(
          fs.readFile(path.join(fixture.root, "child-ready"), "utf8"),
        ).resolves.toBe("ready");
      },
      { interval: 20, timeout: 4_000 },
    );

    await vi.advanceTimersByTimeAsync(20_000);

    await expect(outcome).resolves.toMatchObject({
      error: { message: "Repository migration lock renewal failed." },
    });
    await expect(
      fs.readFile(path.join(fixture.root, "child-stopped"), "utf8"),
    ).resolves.toBe("stopped");
  }, 10_000);

  it("cancels its caller exactly ten seconds after a renewal request stops responding", async () => {
    vi.useFakeTimers();
    blobFaults.renewalHangs = true;
    const started = createDeferred<AbortSignal>();
    const work = createDeferred<string>();
    const storage = new AzureRepositoryStateStorage(credential);
    const operation = storage.withLock(destination, async (signal) => {
      if (!signal) {
        throw new Error("The caller did not receive a cancellation signal.");
      }
      started.resolve(signal);
      signal.addEventListener("abort", () => work.resolve("cancelled"), {
        once: true,
      });
      return work.promise;
    });
    const outcome = operation.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      const signal = await started.promise;
      await vi.advanceTimersByTimeAsync(20_000);
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(9_999);
      expect(signal.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);

      expect(signal.aborted).toBe(true);
      await expect(outcome).resolves.toMatchObject({
        error: { message: "Repository migration lock renewal failed." },
      });
    } finally {
      work.resolve("cleanup");
      await outcome;
    }
  });
});
