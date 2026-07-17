import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const deleteObjectCommandInputs: Record<string, unknown>[] = [];
  const getObjectCommandInputs: Record<string, unknown>[] = [];
  const putObjectCommandInputs: Record<string, unknown>[] = [];

  const mockBlobDeleteIfExists = vi.fn<() => Promise<void>>(
    async () => undefined,
  );
  const mockBlobDownloadToBuffer = vi.fn<() => Promise<Buffer>>(async () =>
    Buffer.from(""),
  );
  const mockBlobUploadFile = vi.fn<(archivePath: string) => Promise<void>>(
    async () => undefined,
  );
  const mockGetBlockBlobClient = vi.fn((blobName: string) => {
    void blobName;

    return {
      uploadFile: mockBlobUploadFile,
    };
  });
  const mockGetBlobClient = vi.fn((blobName: string) => {
    void blobName;

    return {
      deleteIfExists: mockBlobDeleteIfExists,
      downloadToBuffer: mockBlobDownloadToBuffer,
    };
  });
  const mockGetContainerClient = vi.fn((containerName: string) => {
    void containerName;

    return {
      getBlobClient: mockGetBlobClient,
      getBlockBlobClient: mockGetBlockBlobClient,
    };
  });
  const mockS3Send = vi.fn<(command: unknown) => Promise<unknown>>(
    async () => undefined,
  );

  const MockAzureCliCredential = vi.fn(function MockAzureCliCredential() {
    return { kind: "AzureCliCredential" };
  });
  const MockBlobServiceClient = vi.fn(function MockBlobServiceClient() {
    return {
      getContainerClient: mockGetContainerClient,
    };
  });
  const MockS3Client = vi.fn(function MockS3Client() {
    return {
      send: mockS3Send,
    };
  });

  class MockPutObjectCommand {
    readonly input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
      putObjectCommandInputs.push(input);
    }
  }

  class MockGetObjectCommand {
    readonly input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
      getObjectCommandInputs.push(input);
    }
  }

  class MockDeleteObjectCommand {
    readonly input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
      deleteObjectCommandInputs.push(input);
    }
  }

  return {
    deleteObjectCommandInputs,
    getObjectCommandInputs,
    MockAzureCliCredential,
    mockBlobDeleteIfExists,
    mockBlobDownloadToBuffer,
    MockBlobServiceClient,
    mockBlobUploadFile,
    MockDeleteObjectCommand,
    mockGetBlobClient,
    mockGetBlockBlobClient,
    mockGetContainerClient,
    MockGetObjectCommand,
    MockPutObjectCommand,
    MockS3Client,
    mockS3Send,
    putObjectCommandInputs,
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: mocks.MockDeleteObjectCommand,
  GetObjectCommand: mocks.MockGetObjectCommand,
  PutObjectCommand: mocks.MockPutObjectCommand,
  S3Client: mocks.MockS3Client,
}));

vi.mock("@azure/identity", () => ({
  AzureCliCredential: mocks.MockAzureCliCredential,
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: mocks.MockBlobServiceClient,
}));

import {
  computePlanPath,
  deleteRemotePlanBundle,
  downloadPlanBundle,
  readBackendConfig,
  uploadPlanBundle,
} from "../plan-storage.js";

const createTestDirectory = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "dx-tasks-plan-storage-"));

const writeTerraformState = async (
  workingDirectory: string,
  terraformState: unknown,
): Promise<void> => {
  await fs.mkdir(path.join(workingDirectory, ".terraform"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(workingDirectory, ".terraform", "terraform.tfstate"),
    JSON.stringify(terraformState, null, 2),
    "utf8",
  );
};

const createArchiveBuffer = async (
  sourceDirectory: string,
  entries: readonly string[],
): Promise<Buffer> => {
  const archiveDirectory = await createTestDirectory();
  const archivePath = path.join(archiveDirectory, "bundle.tar.gz");

  execFileSync("tar", ["czf", archivePath, "-C", sourceDirectory, ...entries]);

  const archive = await fs.readFile(archivePath);
  await fs.rm(archiveDirectory, { force: true, recursive: true });

  return archive;
};

describe("computePlanPath", () => {
  it("stores the bundle under plan-artifacts when the state key has no directory", () => {
    expect(computePlanPath("terraform.tfstate", "123456")).toBe(
      "plan-artifacts/terraform.tfstate.123456",
    );
  });

  it("stores the bundle next to the state directory when the state key is nested", () => {
    expect(computePlanPath("env/prod/terraform.tfstate", "123456")).toBe(
      "env/prod/plan-artifacts/terraform.tfstate.123456",
    );
  });
});

describe("readBackendConfig", () => {
  let temporaryDirectories: string[] = [];

  beforeEach(() => {
    temporaryDirectories = [];
  });

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directoryPath) =>
        fs.rm(directoryPath, { force: true, recursive: true }),
      ),
    );
  });

  it("reads azurerm backend coordinates from terraform state", async () => {
    const workingDirectory = await createTestDirectory();
    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          container_name: "terraform-state",
          key: "env/prod/terraform.tfstate",
          storage_account_name: "dxstate",
        },
        type: "azurerm",
      },
    });

    await expect(readBackendConfig(workingDirectory)).resolves.toStrictEqual({
      container: "terraform-state",
      key: "env/prod/terraform.tfstate",
      storageAccount: "dxstate",
      type: "azurerm",
    });
  });

  it("reads s3 backend coordinates from terraform state", async () => {
    const workingDirectory = await createTestDirectory();
    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          bucket: "terraform-state",
          key: "terraform.tfstate",
          region: "eu-south-1",
        },
        type: "s3",
      },
    });

    await expect(readBackendConfig(workingDirectory)).resolves.toStrictEqual({
      bucket: "terraform-state",
      key: "terraform.tfstate",
      region: "eu-south-1",
      type: "s3",
    });
  });

  it("throws when terraform state is missing", async () => {
    const workingDirectory = await createTestDirectory();
    temporaryDirectories.push(workingDirectory);

    await expect(readBackendConfig(workingDirectory)).rejects.toThrow(
      `Failed to read Terraform backend state from "${path.join(workingDirectory, ".terraform", "terraform.tfstate")}"`,
    );
  });

  it("throws when terraform state content is invalid", async () => {
    const workingDirectory = await createTestDirectory();
    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          container_name: "terraform-state",
          storage_account_name: "dxstate",
        },
        type: "azurerm",
      },
    });

    await expect(readBackendConfig(workingDirectory)).rejects.toThrow(
      `Failed to validate Terraform backend state at "${path.join(workingDirectory, ".terraform", "terraform.tfstate")}"`,
    );
  });

  it("throws when terraform uses an unsupported backend", async () => {
    const workingDirectory = await createTestDirectory();
    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          bucket: "terraform-state",
          key: "terraform.tfstate",
        },
        type: "gcs",
      },
    });

    await expect(readBackendConfig(workingDirectory)).rejects.toThrow(
      `Unsupported Terraform backend type "gcs" in "${path.join(workingDirectory, ".terraform", "terraform.tfstate")}"`,
    );
  });
});

describe("uploadPlanBundle", () => {
  let temporaryDirectories: string[] = [];

  beforeEach(() => {
    temporaryDirectories = [];
    mocks.putObjectCommandInputs.length = 0;
    mocks.mockBlobUploadFile.mockReset();
    mocks.mockS3Send.mockReset();
    mocks.mockGetBlockBlobClient.mockClear();
    mocks.mockGetContainerClient.mockClear();
    mocks.MockAzureCliCredential.mockClear();
    mocks.MockBlobServiceClient.mockClear();
    mocks.MockS3Client.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directoryPath) =>
        fs.rm(directoryPath, { force: true, recursive: true }),
      ),
    );
    vi.restoreAllMocks();
  });

  it("uploads the bundle to azure and warns when terraform modules are missing", async () => {
    const workingDirectory = await createTestDirectory();
    const capturedArchiveEntries: string[][] = [];

    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          container_name: "terraform-state",
          key: "env/prod/terraform.tfstate",
          storage_account_name: "dxstate",
        },
        type: "azurerm",
      },
    });
    await fs.writeFile(
      path.join(workingDirectory, "plan.tfplan"),
      "plan",
      "utf8",
    );
    await fs.writeFile(
      path.join(workingDirectory, ".terraform.lock.hcl"),
      "lock",
      "utf8",
    );

    mocks.mockBlobUploadFile.mockImplementation(async (archivePath: string) => {
      capturedArchiveEntries.push(
        execFileSync("tar", ["tzf", archivePath], { encoding: "utf8" })
          .trim()
          .split("\n")
          .filter((entry) => entry.length > 0),
      );
    });

    await expect(
      uploadPlanBundle({
        planFile: "plan.tfplan",
        runId: "123456",
        workingDirectory,
      }),
    ).resolves.toStrictEqual({
      backend: {
        container: "terraform-state",
        storageAccount: "dxstate",
        type: "azurerm",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
    });

    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      `Skipping ".terraform/modules/": not found at ${path.join(workingDirectory, ".terraform/modules")}`,
    );
    expect(capturedArchiveEntries).toStrictEqual([
      ["plan.tfplan", ".terraform.lock.hcl"],
    ]);
    expect(mocks.MockAzureCliCredential).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.MockBlobServiceClient).toHaveBeenCalledExactlyOnceWith(
      "https://dxstate.blob.core.windows.net",
      expect.any(Object),
    );
    expect(mocks.mockGetContainerClient).toHaveBeenCalledExactlyOnceWith(
      "terraform-state",
    );
    expect(mocks.mockGetBlockBlobClient).toHaveBeenCalledExactlyOnceWith(
      "env/prod/plan-artifacts/terraform.tfstate.123456",
    );
    expect(mocks.mockBlobUploadFile).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("bundle.tar.gz"),
    );
  });

  it("uploads the bundle to s3", async () => {
    const workingDirectory = await createTestDirectory();

    temporaryDirectories.push(workingDirectory);

    await writeTerraformState(workingDirectory, {
      backend: {
        config: {
          bucket: "terraform-state",
          key: "env/prod/terraform.tfstate",
          region: "eu-south-1",
        },
        type: "s3",
      },
    });
    await fs.writeFile(
      path.join(workingDirectory, "plan.tfplan"),
      "plan",
      "utf8",
    );
    await fs.writeFile(
      path.join(workingDirectory, ".terraform.lock.hcl"),
      "lock",
      "utf8",
    );

    await expect(
      uploadPlanBundle({
        planFile: "plan.tfplan",
        runId: "123456",
        workingDirectory,
      }),
    ).resolves.toStrictEqual({
      backend: {
        bucket: "terraform-state",
        region: "eu-south-1",
        type: "s3",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
    });

    expect(mocks.MockS3Client).toHaveBeenCalledExactlyOnceWith({
      region: "eu-south-1",
    });
    expect(mocks.putObjectCommandInputs).toStrictEqual([
      {
        Body: expect.any(Buffer),
        Bucket: "terraform-state",
        Key: "env/prod/plan-artifacts/terraform.tfstate.123456",
      },
    ]);
    expect(mocks.mockS3Send).toHaveBeenCalledExactlyOnceWith(
      expect.any(mocks.MockPutObjectCommand),
    );
  });
});

describe("downloadPlanBundle", () => {
  let temporaryDirectories: string[] = [];

  beforeEach(() => {
    temporaryDirectories = [];
    mocks.getObjectCommandInputs.length = 0;
    mocks.mockBlobDownloadToBuffer.mockReset();
    mocks.mockS3Send.mockReset();
    mocks.mockGetBlobClient.mockClear();
    mocks.mockGetContainerClient.mockClear();
    mocks.MockAzureCliCredential.mockClear();
    mocks.MockBlobServiceClient.mockClear();
    mocks.MockS3Client.mockClear();
  });

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directoryPath) =>
        fs.rm(directoryPath, { force: true, recursive: true }),
      ),
    );
    vi.restoreAllMocks();
  });

  it("downloads a bundle from s3 and extracts it into the target directory", async () => {
    const sourceDirectory = await createTestDirectory();
    const workingDirectory = await createTestDirectory();

    temporaryDirectories.push(sourceDirectory, workingDirectory);

    await fs.mkdir(path.join(sourceDirectory, ".terraform", "modules"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(sourceDirectory, "plan.tfplan"),
      "plan",
      "utf8",
    );
    await fs.writeFile(
      path.join(sourceDirectory, ".terraform.lock.hcl"),
      "lock",
      "utf8",
    );
    await fs.writeFile(
      path.join(sourceDirectory, ".terraform", "modules", "modules.json"),
      '{"Modules":[]}',
      "utf8",
    );

    const archive = await createArchiveBuffer(sourceDirectory, [
      "plan.tfplan",
      ".terraform.lock.hcl",
      ".terraform/modules",
    ]);

    mocks.mockS3Send.mockResolvedValue({
      Body: {
        transformToByteArray: async () => Uint8Array.from(archive),
      },
    });

    await downloadPlanBundle({
      backend: {
        bucket: "terraform-state",
        region: "eu-south-1",
        type: "s3",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
      workingDirectory,
    });

    await expect(
      fs.readFile(path.join(workingDirectory, "plan.tfplan"), "utf8"),
    ).resolves.toBe("plan");
    await expect(
      fs.readFile(path.join(workingDirectory, ".terraform.lock.hcl"), "utf8"),
    ).resolves.toBe("lock");
    await expect(
      fs.readFile(
        path.join(workingDirectory, ".terraform", "modules", "modules.json"),
        "utf8",
      ),
    ).resolves.toBe('{"Modules":[]}');
    expect(mocks.MockS3Client).toHaveBeenCalledExactlyOnceWith({
      region: "eu-south-1",
    });
    expect(mocks.getObjectCommandInputs).toStrictEqual([
      {
        Bucket: "terraform-state",
        Key: "env/prod/plan-artifacts/terraform.tfstate.123456",
      },
    ]);
  });

  it("downloads a bundle from azure and extracts it into the target directory", async () => {
    const sourceDirectory = await createTestDirectory();
    const workingDirectory = await createTestDirectory();

    temporaryDirectories.push(sourceDirectory, workingDirectory);

    await fs.writeFile(
      path.join(sourceDirectory, "plan.tfplan"),
      "plan",
      "utf8",
    );

    const archive = await createArchiveBuffer(sourceDirectory, ["plan.tfplan"]);

    mocks.mockBlobDownloadToBuffer.mockResolvedValue(archive);

    await downloadPlanBundle({
      backend: {
        container: "terraform-state",
        storageAccount: "dxstate",
        type: "azurerm",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
      workingDirectory,
    });

    await expect(
      fs.readFile(path.join(workingDirectory, "plan.tfplan"), "utf8"),
    ).resolves.toBe("plan");
    expect(mocks.MockAzureCliCredential).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.MockBlobServiceClient).toHaveBeenCalledExactlyOnceWith(
      "https://dxstate.blob.core.windows.net",
      expect.any(Object),
    );
    expect(mocks.mockGetContainerClient).toHaveBeenCalledExactlyOnceWith(
      "terraform-state",
    );
    expect(mocks.mockGetBlobClient).toHaveBeenCalledExactlyOnceWith(
      "env/prod/plan-artifacts/terraform.tfstate.123456",
    );
    expect(mocks.mockBlobDownloadToBuffer).toHaveBeenCalledExactlyOnceWith();
  });
});

describe("deleteRemotePlanBundle", () => {
  beforeEach(() => {
    mocks.deleteObjectCommandInputs.length = 0;
    mocks.mockBlobDeleteIfExists.mockReset();
    mocks.mockS3Send.mockReset();
    mocks.mockGetBlobClient.mockClear();
    mocks.mockGetContainerClient.mockClear();
    mocks.MockBlobServiceClient.mockClear();
    mocks.MockS3Client.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes the remote blob from azure storage", async () => {
    await deleteRemotePlanBundle({
      backend: {
        container: "terraform-state",
        storageAccount: "dxstate",
        type: "azurerm",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
    });

    expect(mocks.MockBlobServiceClient).toHaveBeenCalledExactlyOnceWith(
      "https://dxstate.blob.core.windows.net",
      expect.any(Object),
    );
    expect(mocks.mockGetContainerClient).toHaveBeenCalledExactlyOnceWith(
      "terraform-state",
    );
    expect(mocks.mockGetBlobClient).toHaveBeenCalledExactlyOnceWith(
      "env/prod/plan-artifacts/terraform.tfstate.123456",
    );
    expect(mocks.mockBlobDeleteIfExists).toHaveBeenCalledExactlyOnceWith();
  });

  it("deletes the remote object from s3", async () => {
    await deleteRemotePlanBundle({
      backend: {
        bucket: "terraform-state",
        region: "eu-south-1",
        type: "s3",
      },
      planPath: "env/prod/plan-artifacts/terraform.tfstate.123456",
    });

    expect(mocks.MockS3Client).toHaveBeenCalledExactlyOnceWith({
      region: "eu-south-1",
    });
    expect(mocks.deleteObjectCommandInputs).toStrictEqual([
      {
        Bucket: "terraform-state",
        Key: "env/prod/plan-artifacts/terraform.tfstate.123456",
      },
    ]);
  });
});
