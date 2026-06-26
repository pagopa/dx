/**
 * Prepares the Nx-pruned MCP server output for standalone pnpm installs.
 *
 * Nx gives us a pruned lockfile and copies workspace modules, but this repo
 * still relies on pnpm workspace-only features such as devDependencies,
 * catalog: specifiers and workspace:^ references in copied package manifests.
 * This script rewrites the generated payload so Docker can run pnpm install in
 * isolation, without access to the original monorepo root.
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

    const namedCatalogMatch = /^ {2}([^:#]+):\s*$/.exec(line);

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

const sanitizePackageJsonFile = (workspaceConfig, packageJsonPath) => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

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
};

main();
