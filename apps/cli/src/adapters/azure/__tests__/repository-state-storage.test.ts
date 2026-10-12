/**
 * OAuth blob reads and expiring leases fail explicitly without leaking state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AzureRepositoryStateStorage } from "../repository-state-storage.js";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  createContainer: vi.fn(),
  download: vi.fn(),
  getContainer: vi.fn(),
  release: vi.fn(),
  renew: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class {
    getContainerClient(name: string) {
      mocks.getContainer(name);
      return {
        createIfNotExists: mocks.createContainer,
        getBlobClient: () => ({ downloadToBuffer: mocks.download }),
        getBlockBlobClient: () => ({
          getBlobLeaseClient: () => ({
            acquireLease: mocks.acquire,
            releaseLease: mocks.release,
            renewLease: mocks.renew,
          }),
          upload: mocks.upload,
        }),
      };
    }
  },
}));
vi.mock("node:timers/promises", () => ({
  setTimeout: (
    delay: number,
    _value: undefined,
    { signal }: { signal: AbortSignal },
  ) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("Aborted"));
        },
        { once: true },
      );
    }),
}));

const destination = {
  backend: {
    resourceGroupName: "state-rg",
    storageAccountName: "statest",
    subscriptionId: "sub-id",
    type: "azurerm" as const,
  },
  containerName: "terraform-state",
  key: "dx/payments/repository.tfstate",
};
const storage = new AzureRepositoryStateStorage({ getToken: vi.fn() });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.acquire.mockResolvedValue({});
  mocks.createContainer.mockResolvedValue({});
  mocks.release.mockResolvedValue({});
  mocks.renew.mockResolvedValue({});
  mocks.upload.mockResolvedValue({});
});

describe("repository state storage", () => {
  it("reads state without requiring storage account keys", async () => {
    mocks.download.mockResolvedValue(Buffer.from('{"lineage":"repo"}'));
    await expect(storage.read(destination)).resolves.toBe('{"lineage":"repo"}');
    expect(mocks.getContainer).toHaveBeenCalledWith("terraform-state");
  });

  it("distinguishes a missing state blob from an empty or unreadable one", async () => {
    mocks.download.mockRejectedValueOnce(
      Object.assign(new Error("Missing"), { code: "BlobNotFound" }),
    );
    await expect(storage.read(destination)).resolves.toBeUndefined();
    mocks.download.mockResolvedValueOnce(Buffer.from(""));
    await expect(storage.read(destination)).resolves.toBe("");
    mocks.download.mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), {
        code: "AuthorizationPermissionMismatch",
      }),
    );
    await expect(storage.read(destination)).rejects.toThrow("Cannot read");
  });

  it("serializes migrations and releases the finite lease", async () => {
    await expect(
      storage.withLock(destination, async () => "verified"),
    ).resolves.toBe("verified");
    expect(mocks.upload).toHaveBeenCalledWith("", 0, {
      conditions: { ifNoneMatch: "*" },
    });
    expect(mocks.createContainer).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.acquire).toHaveBeenCalledWith(60);
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith();
  });

  it("repairs an interrupted backend provision before migrating state", async () => {
    mocks.createContainer.mockResolvedValueOnce({ succeeded: true });
    const task = vi.fn(async () => "verified");
    await expect(storage.withLock(destination, task)).resolves.toBe("verified");
    expect(mocks.createContainer).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.acquire).toHaveBeenCalledExactlyOnceWith(60);
  });

  it("does not migrate state when container creation or access fails", async () => {
    mocks.createContainer.mockRejectedValue(new Error("Forbidden"));
    const task = vi.fn();
    await expect(storage.withLock(destination, task)).rejects.toThrow(
      "Cannot prepare the repository state container",
    );
    expect(task).not.toHaveBeenCalled();
    expect(mocks.acquire).not.toHaveBeenCalled();
  });

  it.each(["BlobAlreadyExists", "ConditionNotMet"])(
    "reuses existing coordination blobs (%s) but does not ignore permission failures",
    async (code) => {
      mocks.upload.mockRejectedValueOnce(
        Object.assign(new Error("Exists"), { code }),
      );
      await storage.withLock(destination, async () => undefined);
      mocks.upload.mockRejectedValueOnce(
        Object.assign(new Error("Forbidden"), {
          code: "AuthorizationPermissionMismatch",
        }),
      );
      await expect(storage.withLock(destination, vi.fn())).rejects.toThrow(
        "Cannot create",
      );
    },
  );

  it("does not run migration when another process holds the lease", async () => {
    mocks.acquire.mockRejectedValue(new Error("LeaseAlreadyPresent"));
    const task = vi.fn();
    await expect(storage.withLock(destination, task)).rejects.toThrow(
      "Another migration",
    );
    expect(task).not.toHaveBeenCalled();
  });

  it("releases the lease when migration fails", async () => {
    await expect(
      storage.withLock(destination, async () => {
        throw new Error("Migration failed");
      }),
    ).rejects.toThrow("Migration failed");
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith();
  });

  it("surfaces renewal failures", async () => {
    vi.useFakeTimers();
    mocks.renew.mockRejectedValue(new Error("Lease lost"));
    try {
      const task = vi.fn(async (signal?: AbortSignal) => {
        void signal;
        await vi.advanceTimersByTimeAsync(20_001);
      });
      const result = storage.withLock(destination, task);
      await expect(result).rejects.toThrow("lock renewal failed");
      expect(task.mock.calls[0][0]?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels migration before lease expiry even when renewal hangs", async () => {
    vi.useFakeTimers();
    mocks.renew.mockImplementation(() => new Promise(() => undefined));
    try {
      const task = vi.fn(async (signal?: AbortSignal) => {
        void signal;
        await vi.advanceTimersByTimeAsync(30_001);
      });
      await expect(storage.withLock(destination, task)).rejects.toThrow(
        "lock renewal failed",
      );
      expect(task.mock.calls[0][0]?.aborted).toBe(true);
      expect(mocks.release).toHaveBeenCalledExactlyOnceWith();
    } finally {
      vi.useRealTimers();
    }
  });
});
