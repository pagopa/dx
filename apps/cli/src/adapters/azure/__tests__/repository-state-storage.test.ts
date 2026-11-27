/**
 * Checks that blob occupancy never replaces existence and that CLI migrations serialize.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  download: vi.fn(),
  exists: vi.fn(),
  release: vi.fn(),
  renew: vi.fn(),
  sleep:
    vi.fn<
      (
        delay: number,
        value: undefined,
        options: { signal: AbortSignal },
      ) => Promise<void>
    >(),
  upload: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: vi.fn(function () {
    return {
      getContainerClient: () => ({
        getBlobClient: () => ({
          downloadToBuffer: mocks.download,
          exists: mocks.exists,
        }),
        getBlockBlobClient: () => ({
          getBlobLeaseClient: () => ({
            acquireLease: mocks.acquire,
            releaseLease: mocks.release,
            renewLease: mocks.renew,
          }),
          upload: mocks.upload,
        }),
      }),
    };
  }),
}));
vi.mock("node:timers/promises", () => ({ setTimeout: mocks.sleep }));

import { makeRepositoryStateStorage } from "../repository-state-storage.js";

const destination = {
  containerName: "terraform-state",
  key: "dx/domain/repository.tfstate",
  resourceGroupName: "rg",
  storageAccountName: "storage",
  subscriptionId: "subscription",
};
const credential = { getToken: async () => null };

const untilAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });

describe("repository state storage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sleep.mockImplementation((_delay, _value, { signal }) =>
      untilAborted(signal),
    );
  });

  it.each(["", '{"resources":[]}', '{"resources":[{"mode":"managed"}]}'])(
    "treats an existing blob as occupied regardless of its contents (%s)",
    async (content) => {
      mocks.exists.mockResolvedValue(true);
      mocks.download.mockResolvedValue(Buffer.from(content));

      await expect(
        makeRepositoryStateStorage(credential).exists(destination),
      ).resolves.toBe(true);
    },
  );

  it("reports an absent destination as available", async () => {
    mocks.exists.mockResolvedValue(false);

    await expect(
      makeRepositoryStateStorage(credential).exists(destination),
    ).resolves.toBe(false);
  });

  it("propagates permission and transport failures rather than treating them as absence", async () => {
    mocks.exists.mockRejectedValue(new Error("Forbidden"));

    await expect(
      makeRepositoryStateStorage(credential).exists(destination),
    ).rejects.toThrow(/Cannot check/);
  });

  it("releases the migration lease after an operation fails", async () => {
    await expect(
      makeRepositoryStateStorage(credential).withLock(destination, async () => {
        throw new Error("plan rejected");
      }),
    ).rejects.toThrow("plan rejected");
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith();
  });

  it("blocks a second migration before it can check or copy state", async () => {
    mocks.acquire
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("LeaseAlreadyPresent"));
    let finish: (() => void) | undefined;
    const storage = makeRepositoryStateStorage(credential);
    const first = storage.withLock(
      destination,
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await vi.waitFor(() => expect(finish).toBeDefined());
    const second = vi.fn(async () => undefined);

    await expect(storage.withLock(destination, second)).rejects.toThrow(
      /Another migration/,
    );
    expect(second).not.toHaveBeenCalled();
    finish?.();
    await first;
  });

  it("cancels the active operation when lease renewal fails", async () => {
    mocks.sleep.mockResolvedValueOnce(undefined);
    mocks.renew.mockRejectedValue(new Error("lease lost"));

    await expect(
      makeRepositoryStateStorage(credential).withLock(
        destination,
        untilAborted,
      ),
    ).rejects.toThrow(/lock was lost/);
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith();
  });

  it("preserves the migration failure if lease release also fails", async () => {
    mocks.release.mockRejectedValue(new Error("release failed"));

    await expect(
      makeRepositoryStateStorage(credential).withLock(destination, async () => {
        throw new Error("plan rejected");
      }),
    ).rejects.toThrow(/plan rejected.*cannot release/);
  });
});
