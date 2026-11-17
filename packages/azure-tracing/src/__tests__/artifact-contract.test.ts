/**
 * Guards the published artifact contract: every `exports` subpath resolves to a
 * file inside `dist`, and every bare module those built files load is declared
 * as a runtime dependency. `tsup` bundles with `bundle: true`, so an undeclared
 * runtime import would be silently inlined into `dist` and shipped to consumers
 * as a second copy.
 *
 * These checks describe the artifact, not a scenario, and run in the regular
 * unit-test task without containers.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const distDirectory = join(packageRoot, "dist");
const packageManifestPath = join(packageRoot, "package.json");

const nodeBuiltinModules = new Set(
  builtinModules.flatMap((specifier) => [specifier, `node:${specifier}`]),
);

const moduleSpecifierPatterns = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

interface ExportFile {
  readonly condition: string;
  readonly file: string;
  readonly subpath: string;
}

type ExportTarget = ExportTargetConditions | string;

interface ExportTargetConditions {
  readonly [condition: string]: ExportTarget;
}

interface PackageManifest {
  readonly dependencies: Readonly<Record<string, string>>;
  readonly exports: Readonly<Record<string, ExportTarget>>;
  readonly files: readonly string[];
  readonly peerDependencies: Readonly<Record<string, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringRecord = (
  value: unknown,
  field: string,
): Readonly<Record<string, string>> => {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(`package.json ${field} must be an object.`);
  }

  const entries: [string, string][] = [];

  for (const [name, range] of Object.entries(value)) {
    if (typeof range !== "string") {
      throw new Error(`package.json ${field}.${name} must be a string.`);
    }

    entries.push([name, range]);
  }

  return Object.fromEntries(entries);
};

const toStringArray = (value: unknown, field: string): readonly string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`package.json ${field} must be an array.`);
  }

  const entries: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error(`package.json ${field} must contain only strings.`);
    }

    entries.push(entry);
  }

  return entries;
};

const toExportTarget = (value: unknown, path: string): ExportTarget => {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    throw new Error(
      `package.json ${path} must be a string or a condition map.`,
    );
  }

  const conditions: Record<string, ExportTarget> = {};

  for (const [condition, target] of Object.entries(value)) {
    conditions[condition] = toExportTarget(target, `${path}.${condition}`);
  }

  return conditions;
};

const toExports = (value: unknown): Readonly<Record<string, ExportTarget>> => {
  if (!isRecord(value)) {
    throw new Error("package.json exports must be an object.");
  }

  const entries: [string, ExportTarget][] = [];

  for (const [subpath, target] of Object.entries(value)) {
    entries.push([subpath, toExportTarget(target, `exports["${subpath}"]`)]);
  }

  return Object.fromEntries(entries);
};

const readPackageManifest = async (): Promise<PackageManifest> => {
  const parsed: unknown = JSON.parse(
    await readFile(packageManifestPath, "utf8"),
  );

  if (!isRecord(parsed)) {
    throw new Error("package.json must contain an object.");
  }

  return {
    dependencies: toStringRecord(parsed.dependencies, "dependencies"),
    exports: toExports(parsed.exports),
    files: toStringArray(parsed.files, "files"),
    peerDependencies: toStringRecord(
      parsed.peerDependencies,
      "peerDependencies",
    ),
  };
};

const flattenExportTarget = (
  target: ExportTarget,
  condition: string,
): Omit<ExportFile, "subpath">[] =>
  typeof target === "string"
    ? [{ condition, file: target }]
    : Object.entries(target).flatMap(([nestedCondition, nestedTarget]) =>
        flattenExportTarget(nestedTarget, `${condition}.${nestedCondition}`),
      );

const isBareSpecifier = (specifier: string) =>
  !specifier.startsWith(".") &&
  !specifier.startsWith("/") &&
  !specifier.startsWith("node:") &&
  !nodeBuiltinModules.has(specifier);

const getPackageName = (specifier: string) => {
  const segments = specifier.split("/");

  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
};

const readModuleSpecifiers = async (file: string) => {
  const fileContents = await readFile(join(packageRoot, file), "utf8");
  const specifiers = new Set<string>();

  for (const pattern of moduleSpecifierPatterns) {
    for (const match of fileContents.matchAll(pattern)) {
      const specifier = match[1];

      if (specifier !== undefined && isBareSpecifier(specifier)) {
        specifiers.add(specifier);
      }
    }
  }

  return specifiers;
};

const manifest = await readPackageManifest();

const exportFiles: ExportFile[] = Object.entries(manifest.exports).flatMap(
  ([subpath, target]) =>
    flattenExportTarget(target, "default").map(({ condition, file }) => ({
      condition,
      file,
      subpath,
    })),
);

const entryFiles = [
  ...new Set(
    exportFiles
      .filter(
        ({ condition }) =>
          condition.endsWith("import") || condition.endsWith("require"),
      )
      .map(({ file }) => file),
  ),
];

const declaredRuntimeDependencies = new Set([
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.peerDependencies),
]);

test("builds the dist directory the contract refers to", () => {
  expect(
    existsSync(distDirectory),
    "The dist directory is missing; run the build before this suite.",
  ).toBe(true);
});

test.each(exportFiles)(
  "export $subpath ($condition) points to a built file",
  ({ file }) => {
    expect(
      file.startsWith("./dist/"),
      `${file} must point inside dist, not into the sources.`,
    ).toBe(true);
    expect(
      file.includes("__tests__"),
      `${file} must not point into a test directory.`,
    ).toBe(false);
    expect(
      existsSync(join(packageRoot, file)),
      `${file} is referenced by exports but is missing from dist.`,
    ).toBe(true);
  },
);

test.each(entryFiles)(
  "built entry %s only loads declared runtime dependencies",
  async (file) => {
    const importedPackages = [...(await readModuleSpecifiers(file))].map(
      getPackageName,
    );
    const undeclaredPackages = importedPackages.filter(
      (packageName) => !declaredRuntimeDependencies.has(packageName),
    );

    expect(
      undeclaredPackages,
      `${file} loads runtime modules that are not declared in dependencies or peerDependencies. Declare them so tsup does not inline a private copy into dist.`,
    ).toEqual([]);
  },
);

test("publishes the dist directory", () => {
  expect(manifest.files).toContain("dist");
});
