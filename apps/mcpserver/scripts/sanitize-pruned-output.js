/**
 * Prepares the Nx-pruned MCP server output for standalone pnpm installs.
 *
 * Nx gives us a pruned lockfile and copies workspace modules, but this repo
 * still relies on pnpm workspace-only features such as devDependencies,
 * catalog: specifiers and workspace:^ references in copied package manifests.
 * This is a temporary workaround for the current Nx gap around pnpm catalog
 * support in pruned outputs and should be removed once the upstream fix lands.
 * This script rewrites both the generated manifests and the pruned lockfile so
 * Docker can run pnpm install in isolation, without access to the original
 * monorepo root.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootPath = path.resolve(scriptDirectoryPath, "..");
const distRootPath = path.join(projectRootPath, "dist");
const workspaceConfigPath = path.resolve(
  projectRootPath,
  "../../pnpm-workspace.yaml",
);

const stripWrappingQuotes = (value) => value.replace(/^['"]|['"]$/g, "");

const parseWorkspaceConfig = () => {
  const workspaceConfigContents = readFileSync(workspaceConfigPath, "utf8");
  const rootCatalog = {};
  const namedCatalogs = {};
  let section = null;
  let activeCatalogName = null;

  for (const rawLine of workspaceConfigContents.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    if (!line.startsWith(" ")) {
      section = null;
      activeCatalogName = null;
    }

    if (trimmedLine === "catalog:") {
      section = "catalog";
      activeCatalogName = null;
      continue;
    }

    if (trimmedLine === "catalogs:") {
      section = "catalogs";
      activeCatalogName = null;
      continue;
    }

    if (section === "catalog") {
      const catalogEntryMatch = /^ {2}(.+?):\s+(.+)\s*$/.exec(line);

      if (catalogEntryMatch) {
        const [, packageName, specifier] = catalogEntryMatch;
        rootCatalog[stripWrappingQuotes(packageName.trim())] =
          stripWrappingQuotes(specifier.trim());
      }

      continue;
    }

    if (section !== "catalogs") {
      continue;
    }

    const namedCatalogMatch = /^ {2}(\S[^:#]*):\s*$/.exec(line);

    if (namedCatalogMatch) {
      activeCatalogName = stripWrappingQuotes(namedCatalogMatch[1].trim());
      namedCatalogs[activeCatalogName] = {};
      continue;
    }

    const namedCatalogEntryMatch = /^ {4}(.+?):\s+(.+)\s*$/.exec(line);

    if (!activeCatalogName || !namedCatalogEntryMatch) {
      continue;
    }

    const [, packageName, specifier] = namedCatalogEntryMatch;

    namedCatalogs[activeCatalogName][stripWrappingQuotes(packageName.trim())] =
      stripWrappingQuotes(specifier.trim());
  }

  return {
    catalog: rootCatalog,
    catalogs: namedCatalogs,
  };
};

const resolveCatalogSpecifier = (workspaceConfig, packageName, specifier) => {
  if (!specifier.startsWith("catalog:")) {
    return specifier;
  }

  const catalogName = specifier.slice("catalog:".length);

  if (catalogName.length === 0) {
    const defaultCatalog = workspaceConfig.catalog;

    if (!defaultCatalog || typeof defaultCatalog !== "object") {
      throw new Error(`Missing default catalog for ${packageName}.`);
    }

    const resolvedSpecifier = defaultCatalog[packageName];

    if (typeof resolvedSpecifier !== "string") {
      throw new Error(`Missing default catalog entry for ${packageName}.`);
    }

    return resolvedSpecifier;
  }

  const namedCatalogs = workspaceConfig.catalogs;

  if (!namedCatalogs || typeof namedCatalogs !== "object") {
    throw new Error(`Missing named catalogs for ${packageName}.`);
  }

  const namedCatalog = namedCatalogs[catalogName];

  if (!namedCatalog || typeof namedCatalog !== "object") {
    throw new Error(`Missing catalog ${catalogName} for ${packageName}.`);
  }

  const resolvedSpecifier = namedCatalog[packageName];

  if (typeof resolvedSpecifier !== "string") {
    throw new Error(`Missing catalog entry ${catalogName}:${packageName}.`);
  }

  return resolvedSpecifier;
};

const sanitizeDependencySection = (workspaceConfig, dependencies) => {
  if (!dependencies || typeof dependencies !== "object") {
    return dependencies;
  }

  return Object.fromEntries(
    Object.entries(dependencies).map(([packageName, specifier]) => {
      if (typeof specifier !== "string") {
        return [packageName, specifier];
      }

      return [
        packageName,
        resolveCatalogSpecifier(workspaceConfig, packageName, specifier),
      ];
    }),
  );
};

const writeJsonFile = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const readJsonFile = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

const writePrunedWorkspaceConfig = () => {
  const workspaceConfigContents = readFileSync(workspaceConfigPath, "utf8");
  const prunedWorkspaceConfigContents = workspaceConfigContents.replace(
    /^packages:\n(?: {2}- .*\n)+/m,
    ["packages:", "  - workspace_modules/**", ""].join("\n"),
  );

  writeFileSync(
    path.join(distRootPath, "pnpm-workspace.yaml"),
    prunedWorkspaceConfigContents,
  );
};

const sanitizePackageJsonFile = (workspaceConfig, packageJsonPath) => {
  const packageJson = readJsonFile(packageJsonPath);

  // The pruned payload is installed with --prod, so keeping devDependencies only
  // introduces workspace-only references that cannot be resolved in Docker.
  delete packageJson.devDependencies;

  packageJson.dependencies = sanitizeDependencySection(
    workspaceConfig,
    packageJson.dependencies,
  );
  packageJson.optionalDependencies = sanitizeDependencySection(
    workspaceConfig,
    packageJson.optionalDependencies,
  );
  packageJson.peerDependencies = sanitizeDependencySection(
    workspaceConfig,
    packageJson.peerDependencies,
  );

  writeJsonFile(packageJsonPath, packageJson);
};

const parseLockfileImporters = (lockfileContents) => {
  const [beforePackages, packagesContents] =
    lockfileContents.split("\npackages:\n");

  if (!beforePackages || packagesContents === undefined) {
    throw new Error("Expected a pnpm lockfile with an importers section.");
  }

  const beforePackagesLines = beforePackages.split("\n");
  const importersIndex = beforePackagesLines.indexOf("importers:");

  if (importersIndex === -1) {
    throw new Error("Expected an importers section in the pruned lockfile.");
  }

  const headerLines = beforePackagesLines.slice(0, importersIndex + 1);
  const importerLines = beforePackagesLines.slice(importersIndex + 1);
  const importers = {};
  const importerOrder = [];
  let currentImporterPath = null;
  let currentSectionName = null;
  let currentPackageName = null;

  for (const line of importerLines) {
    if (!line.trim()) {
      continue;
    }

    const importerMatch = /^ {2}(\S.*):\s*$/.exec(line);

    if (importerMatch) {
      currentImporterPath = stripWrappingQuotes(importerMatch[1].trim());
      importers[currentImporterPath] = {};
      importerOrder.push(currentImporterPath);
      currentSectionName = null;
      currentPackageName = null;
      continue;
    }

    if (!currentImporterPath) {
      continue;
    }

    const sectionMatch =
      /^ {4}(dependencies|optionalDependencies|peerDependencies|devDependencies):\s*$/.exec(
        line,
      );

    if (sectionMatch) {
      currentSectionName = sectionMatch[1];
      importers[currentImporterPath][currentSectionName] = {};
      currentPackageName = null;
      continue;
    }

    if (!currentSectionName) {
      continue;
    }

    const packageMatch = /^ {6}(\S.*):\s*$/.exec(line);

    if (packageMatch) {
      currentPackageName = stripWrappingQuotes(packageMatch[1].trim());
      importers[currentImporterPath][currentSectionName][currentPackageName] =
        {};
      continue;
    }

    if (!currentPackageName) {
      continue;
    }

    const specifierMatch = /^ {8}specifier:\s+(.+)\s*$/.exec(line);

    if (specifierMatch) {
      importers[currentImporterPath][currentSectionName][
        currentPackageName
      ].specifier = stripWrappingQuotes(specifierMatch[1].trim());
      continue;
    }

    const versionMatch = /^ {8}version:\s+(.+)\s*$/.exec(line);

    if (versionMatch) {
      importers[currentImporterPath][currentSectionName][
        currentPackageName
      ].version = stripWrappingQuotes(versionMatch[1].trim());
    }
  }

  return {
    headerText: headerLines.join("\n"),
    importerOrder,
    importers,
    packagesText: `packages:\n${packagesContents}`,
  };
};

const formatLockfileKey = (value) => {
  if (/^[A-Za-z0-9._-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "''")}'`;
};

const toLockfileImporterPath = (packageJsonPath) => {
  const importerDirectoryPath = path.dirname(packageJsonPath);
  const relativePath = path.relative(distRootPath, importerDirectoryPath);

  if (!relativePath) {
    return ".";
  }

  return relativePath.split(path.sep).join("/");
};

const getLockfilePackageEntry = (
  importers,
  importerPath,
  sectionName,
  packageName,
) => {
  const importerSections = importers[importerPath];

  if (!importerSections || typeof importerSections !== "object") {
    throw new Error(`Missing lockfile importer ${importerPath}.`);
  }

  const sectionEntry = importerSections[sectionName]?.[packageName];

  if (sectionEntry) {
    return sectionEntry;
  }

  for (const dependencyGroup of Object.values(importerSections)) {
    if (dependencyGroup && typeof dependencyGroup === "object") {
      const dependencyEntry = dependencyGroup[packageName];

      if (dependencyEntry) {
        return dependencyEntry;
      }
    }
  }

  throw new Error(
    `Missing lockfile entry for ${importerPath}:${sectionName}:${packageName}.`,
  );
};

const serializeLockfileSections = (importers, importerPath, packageJson) => {
  const lines = [];

  for (const sectionName of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
    "devDependencies",
  ]) {
    const dependencies = packageJson[sectionName];

    if (!dependencies || typeof dependencies !== "object") {
      continue;
    }

    const entries = Object.entries(dependencies);

    if (entries.length === 0) {
      continue;
    }

    lines.push(`    ${sectionName}:`);

    for (const [packageName, specifier] of entries) {
      const lockfileEntry = getLockfilePackageEntry(
        importers,
        importerPath,
        sectionName,
        packageName,
      );

      lines.push(`      ${formatLockfileKey(packageName)}:`);
      lines.push(`        specifier: ${specifier}`);
      lines.push(`        version: ${lockfileEntry.version}`);
    }
  }

  return lines;
};

const sanitizeLockfile = (rootPackageJsonPath, workspacePackageJsonPaths) => {
  const lockfilePath = path.join(distRootPath, "pnpm-lock.yaml");
  const lockfileContents = readFileSync(lockfilePath, "utf8");
  const { headerText, importerOrder, importers, packagesText } =
    parseLockfileImporters(lockfileContents);
  const packageJsonByImporterPath = new Map(
    [rootPackageJsonPath, ...workspacePackageJsonPaths].map(
      (packageJsonPath) => [
        toLockfileImporterPath(packageJsonPath),
        readJsonFile(packageJsonPath),
      ],
    ),
  );
  const importerLines = [];

  for (const importerPath of importerOrder) {
    const packageJson = packageJsonByImporterPath.get(importerPath);

    importerLines.push(`  ${formatLockfileKey(importerPath)}:`);

    if (!packageJson) {
      const importerSections = importers[importerPath];

      for (const [sectionName, dependencies] of Object.entries(
        importerSections,
      )) {
        importerLines.push(`    ${sectionName}:`);

        for (const [packageName, dependencyEntry] of Object.entries(
          dependencies,
        )) {
          importerLines.push(`      ${formatLockfileKey(packageName)}:`);
          importerLines.push(`        specifier: ${dependencyEntry.specifier}`);
          importerLines.push(`        version: ${dependencyEntry.version}`);
        }
      }

      continue;
    }

    importerLines.push(
      ...serializeLockfileSections(importers, importerPath, packageJson),
    );
  }

  writeFileSync(
    lockfilePath,
    `${headerText}\n${importerLines.join("\n")}\n\n${packagesText}\n`,
  );
};

const collectWorkspacePackageJsonPaths = (directoryPath) => {
  if (!statSync(directoryPath).isDirectory()) {
    return [];
  }

  const collectedPaths = [];

  for (const entryName of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entryName);
    const entryStats = statSync(entryPath);

    if (entryStats.isDirectory()) {
      collectedPaths.push(...collectWorkspacePackageJsonPaths(entryPath));
      continue;
    }

    if (entryName === "package.json") {
      collectedPaths.push(entryPath);
    }
  }

  return collectedPaths;
};

const main = () => {
  const workspaceConfig = parseWorkspaceConfig();
  const rootPackageJsonPath = path.join(distRootPath, "package.json");
  const workspaceModulesRootPath = path.join(distRootPath, "workspace_modules");

  // Sanitize the root package first, then every copied workspace dependency so
  // pnpm never encounters unresolved catalog/workspace metadata during install.
  sanitizePackageJsonFile(workspaceConfig, rootPackageJsonPath);

  const workspacePackageJsonPaths = collectWorkspacePackageJsonPaths(
    workspaceModulesRootPath,
  );

  for (const workspacePackageJsonPath of workspacePackageJsonPaths) {
    sanitizePackageJsonFile(workspaceConfig, workspacePackageJsonPath);
  }

  sanitizeLockfile(rootPackageJsonPath, workspacePackageJsonPaths);
  writePrunedWorkspaceConfig();
};

main();
