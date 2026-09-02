/**
 * Builds and persists deterministic Terraform Registry module locks for tasks.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

const lockFileName = "tfmodules.lock.json";
const registryPrefix = "registry.terraform.io/";

const metadataModuleSchema = z.object({
  Key: z.string(),
  Source: z.string(),
  Version: z.string().optional(),
});

const modulesMetadataSchema = z.object({
  Modules: z.array(metadataModuleSchema),
});

const lockEntrySchema = z
  .object({
    hash: z.string(),
    source: z.string(),
  })
  .strict();

const moduleLockSchema = z.record(z.string(), lockEntrySchema);
const moduleLockFileVersion = 2 as const;
const moduleLockFileSchema = z
  .object({
    lockFileVersion: z.literal(moduleLockFileVersion),
    modules: moduleLockSchema,
  })
  .strict();
const legacyLockEntrySchema = z.union([
  z.string(),
  z
    .object({
      hash: z.string(),
      source: z.string(),
    })
    .loose(),
]);
const legacyModuleLockSchema = z.record(z.string(), legacyLockEntrySchema);
const readableModuleLockSchema = z.union([
  moduleLockFileSchema.transform(({ modules }) => ({
    formatVersion: moduleLockFileVersion,
    modules,
  })),
  legacyModuleLockSchema.transform((modules) => ({
    formatVersion: 1 as const,
    modules,
  })),
]);

export type ModuleLock = Record<string, ModuleLockEntry>;

export interface ModuleLockChange {
  key: string;
  status: "added" | "changed" | "removed";
}

export interface ModuleLockComparison {
  changes: readonly ModuleLockChange[];
  content: string;
  formatVersion: 1 | 2;
  isDifferent: boolean;
  path: string;
}

type ModuleLockEntry = z.infer<typeof lockEntrySchema>;
type ModuleLockValue = z.infer<typeof legacyLockEntrySchema>;
type ReadableModuleLock = z.infer<typeof readableModuleLockSchema>;
const hash = (content: Buffer | string) =>
  createHash("sha256").update(content).digest("hex");

const isFileNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const parseAndValidateJson = <T>(
  content: string,
  filePath: string,
  schema: z.ZodType<T>,
): T => {
  try {
    return schema.parse(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}`, { cause: error });
    }
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid data in ${filePath}: ${z.prettifyError(error)}`,
        { cause: error },
      );
    }
    throw error;
  }
};

const listModuleFiles = async (
  modulePath: string,
  relativePath = "",
): Promise<string[]> => {
  const directoryPath = path.join(modulePath, relativePath);
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  // Match lock-modules.sh by excluding hidden entries at the module root.
  const visibleEntries =
    relativePath === ""
      ? entries.filter((entry) => !entry.name.startsWith("."))
      : entries;
  const files = await Promise.all(
    visibleEntries.map(async (entry) => {
      const entryRelativePath = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        return listModuleFiles(modulePath, entryRelativePath);
      }
      return entry.isFile() ? [path.join(modulePath, entryRelativePath)] : [];
    }),
  );
  // Filesystem traversal order is not guaranteed; stable sorting keeps the
  // nested checksum reproducible and matches lock-modules.sh.
  return files
    .flat()
    .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
};

export const calculateModuleHash = async (
  modulePath: string,
): Promise<string> => {
  const filePaths = await listModuleFiles(modulePath);
  const fileHashes: string[] = [];
  for (const filePath of filePaths) {
    fileHashes.push(hash(await fs.readFile(filePath)));
  }
  // Preserve the shell script's nested checksum: hash each file, then hash the
  // newline-delimited list of those checksums.
  const hashes = fileHashes.length > 0 ? fileHashes : [hash(Buffer.from(""))];
  return hash(hashes.map((fileHash) => `${fileHash}\n`).join(""));
};

const getRegistryModuleSource = (
  source: string,
  registryVersion: string | undefined,
) =>
  `https://registry.terraform.io/modules/${source.slice(registryPrefix.length)}/${registryVersion ?? "latest"}`;

const getRegistryModules = async (projectRoot: string) => {
  const metadataPath = path.join(
    projectRoot,
    ".terraform",
    "modules",
    "modules.json",
  );
  let metadata: undefined | z.infer<typeof modulesMetadataSchema>;
  try {
    const content = await fs.readFile(metadataPath, "utf8");
    metadata = parseAndValidateJson(
      content,
      metadataPath,
      modulesMetadataSchema,
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }
  // Only Registry modules have entries in this lock format; other sources are
  // intentionally left to Terraform's own dependency handling.
  return (metadata?.Modules ?? []).filter(
    (module) => module.Key !== "" && module.Source.startsWith(registryPrefix),
  );
};

const generateModuleLockEntry = async (
  modulesRoot: string,
  module: z.infer<typeof metadataModuleSchema>,
): Promise<[string, ModuleLockEntry]> => {
  const modulePath = path.resolve(modulesRoot, module.Key);
  // Terraform metadata is external input, so prevent a module key from
  // escaping the cache before hashing files.
  const relativeModulePath = path.relative(modulesRoot, modulePath);
  if (
    relativeModulePath === "" ||
    relativeModulePath === ".." ||
    relativeModulePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeModulePath)
  ) {
    throw new Error(
      `Invalid Terraform module key outside the module cache: ${module.Key}`,
    );
  }
  const hash = await calculateModuleHash(modulePath);
  const source = getRegistryModuleSource(module.Source, module.Version);
  return [module.Key, { hash, source }];
};

export const generateModuleLock = async (
  projectRoot: string,
): Promise<ModuleLock> => {
  const registryModules = await getRegistryModules(projectRoot);
  const modulesRoot = path.resolve(projectRoot, ".terraform", "modules");
  const entries = await Promise.all(
    registryModules.map((module) =>
      generateModuleLockEntry(modulesRoot, module),
    ),
  );
  return Object.fromEntries(entries);
};

export const serializeModuleLock = (lock: ModuleLock): string =>
  `${JSON.stringify(
    {
      lockFileVersion: moduleLockFileVersion,
      modules: lock,
    },
    undefined,
    2,
  )}\n`;

const readCurrentModuleLock = async (
  lockPath: string,
): Promise<ReadableModuleLock> => {
  try {
    const content = await fs.readFile(lockPath, "utf8");
    return parseAndValidateJson(content, lockPath, readableModuleLockSchema);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return {
        formatVersion: moduleLockFileVersion,
        modules: {},
      };
    }
    throw error;
  }
};

const compareModuleKeys = (left: string, right: string): number =>
  Buffer.from(left).compare(Buffer.from(right));

const getEntryHash = (
  entry: ModuleLockValue | undefined,
): string | undefined => (typeof entry === "string" ? entry : entry?.hash);

const getModuleLockChanges = (
  currentLock: Record<string, ModuleLockValue>,
  generatedLock: ModuleLock,
): ModuleLockChange[] => {
  const allKeys = Array.from(
    new Set([...Object.keys(currentLock), ...Object.keys(generatedLock)]),
  ).sort(compareModuleKeys);

  return allKeys.flatMap((key): ModuleLockChange[] => {
    if (!Object.hasOwn(currentLock, key)) {
      return [{ key, status: "added" }];
    }
    if (!Object.hasOwn(generatedLock, key)) {
      return [{ key, status: "removed" }];
    }
    const currentEntry = currentLock[key];
    const generatedEntry = generatedLock[key];
    if (getEntryHash(currentEntry) !== generatedEntry.hash) {
      return [{ key, status: "changed" }];
    }
    return [];
  });
};

const preserveLockOrder = (
  currentLock: Record<string, ModuleLockValue>,
  generatedLock: ModuleLock,
  preserveEntries: boolean,
): ModuleLock => {
  // Keep existing modules in place so regenerated locks do not create noisy diffs.
  const currentKeys = Object.keys(currentLock).filter((key) =>
    Object.hasOwn(generatedLock, key),
  );
  const newKeys = Object.keys(generatedLock)
    .filter((key) => !Object.hasOwn(currentLock, key))
    .sort(compareModuleKeys);
  return Object.fromEntries(
    [...currentKeys, ...newKeys].map((key) => {
      const generatedEntry = generatedLock[key];
      const currentEntry = Object.hasOwn(currentLock, key)
        ? currentLock[key]
        : undefined;
      const entry =
        preserveEntries &&
        typeof currentEntry !== "string" &&
        currentEntry?.hash === generatedEntry.hash
          ? { hash: currentEntry.hash, source: currentEntry.source }
          : generatedEntry;
      return [key, entry];
    }),
  );
};

export const compareModuleLock = async (
  projectRoot: string,
): Promise<ModuleLockComparison> => {
  const lockPath = path.join(projectRoot, lockFileName);
  const [generatedLock, currentLock] = await Promise.all([
    generateModuleLock(projectRoot),
    readCurrentModuleLock(lockPath),
  ]);
  const orderedLock = preserveLockOrder(
    currentLock.modules,
    generatedLock,
    currentLock.formatVersion === moduleLockFileVersion,
  );
  const content = serializeModuleLock(orderedLock);
  const changes = getModuleLockChanges(currentLock.modules, generatedLock);
  return {
    changes,
    content,
    formatVersion: currentLock.formatVersion,
    isDifferent:
      currentLock.formatVersion !== moduleLockFileVersion || changes.length > 0,
    path: lockPath,
  };
};
