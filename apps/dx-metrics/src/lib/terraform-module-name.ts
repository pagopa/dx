/**
 * Terraform module identity helpers.
 *
 * A module source is written differently depending on where the module lives
 * (public registry, private registry, git, plain HTTP), but the reader cares
 * about the module, not the transport. These helpers collapse every source to a
 * short name so usage can be grouped across repositories.
 */

/** Registry namespace must not look like a host: no dots, no scheme colon. */
const REGISTRY_SOURCE = /^([^/.:]+)\/([^/]+)\/([^/]+)$/;
/** Private registry: host/namespace/name/provider. */
const PRIVATE_REGISTRY_SOURCE = /^([^/:]+\.[^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/;
const QUERY = /[?#].*$/;
const GIT_GETTER = /^(?:git|hg)::/;
const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const CREDENTIALS = /^[^@/]+@/;
const ARCHIVE_SUFFIX = /\.(?:git|zip|tar\.gz|tgz)$/i;

/**
 * Folds a raw name into its canonical form: lower case with underscores turned
 * into hyphens. Legacy GitHub modules used snake_case paths
 * (`azure_role_assignments`) while the registry publishes kebab-case names
 * (`azure-role-assignments`); without this they would be counted as two modules.
 */
const canonicalModuleName = (name: string): string =>
  name.toLowerCase().replace(/_/g, "-");

/**
 * Extracts the short module name from a Terraform source.
 *
 * - `pagopa-dx/azure-role-assignments/azurerm` → `azure-role-assignments`
 * - `git::https://github.com/terraform-aws-modules/terraform-aws-acm.git?ref=…`
 *   → `terraform-aws-acm`
 * - `github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main`
 *   → `azure-role-assignments`
 * - `app.terraform.io/org/name/provider` → `name`
 *
 * Local paths (`./`, `../`) are filtered out before this runs; if no rule
 * matches, the original source is returned so a module is never dropped.
 */
export const normalizeTerraformModuleName = (source: string): string => {
  const trimmed = source.trim();

  if (trimmed.length === 0) {
    return source;
  }

  const withoutQuery = trimmed.replace(QUERY, "");

  // Public registry. Requiring the first segment to have no dot keeps
  // `github.com/org/repo` from being read as namespace `github.com`.
  const registry = REGISTRY_SOURCE.exec(withoutQuery);
  if (registry) {
    return canonicalModuleName(registry[2]);
  }

  // Private registry: the name is the third segment.
  const privateRegistry = PRIVATE_REGISTRY_SOURCE.exec(withoutQuery);
  if (privateRegistry) {
    return canonicalModuleName(privateRegistry[3]);
  }

  // Git and HTTP sources: drop the getter, the scheme, and any credentials so
  // only the path remains.
  const path = withoutQuery
    .replace(GIT_GETTER, "")
    .replace(SCHEME, "")
    .replace(CREDENTIALS, "");

  // `//` starts a subdirectory inside the repository; the module lives there.
  const [, subdirectory] = path.split("//");
  const candidate = subdirectory ?? path;
  const segments = candidate.split("/").filter((segment) => segment.length > 0);
  const last = segments.at(-1) ?? "";

  // Archives and repository URLs end with an extension that is not part of the
  // module name.
  return canonicalModuleName(last.replace(ARCHIVE_SUFFIX, "")) || source;
};

/** True when the source points to a DX module, matching the SQL predicate. */
export const isDxTerraformModule = (source: string): boolean =>
  source.includes("pagopa-dx") || source.includes("pagopa/dx");

/** One module declaration as stored by the importer. */
export interface TerraformModuleDeclaration {
  readonly module: string;
  readonly repository: string;
}

/** Usage of one module after grouping declarations by normalised name. */
export interface TerraformModuleUsage {
  readonly module: string;
  readonly moduleType: "DX" | "Non-DX";
  readonly repositoryCount: number;
  /**
   * Non-normalised source expressions that produced this group, without the
   * version selector, most-used first. GitHub code search does not combine
   * quoted expressions with `OR` reliably, so the UI searches the first one.
   */
  readonly sources: string[];
  readonly usageCount: number;
}

/**
 * Source expression without the version selector (`?ref=…` / `#…`). Different
 * pins of the same module collapse to one search term while the expression
 * itself stays unnormalised.
 */
const sourceSearchTerm = (source: string): string =>
  source.trim().replace(QUERY, "");

/**
 * Groups module declarations by DX/non-DX and normalised name.
 *
 * `usageCount` counts declarations, so a module declared in three files of one
 * repository counts three times; `repositoryCount` counts distinct repositories,
 * which is the measure of how widely the module spread. `sources` keeps the raw
 * source expressions, most-used first: GitHub code search does not combine
 * quoted expressions with `OR` reliably (it returns no results), so the UI links
 * to the primary one. DX and non-DX names are grouped separately so a short name
 * that exists on both sides stays visible in both tables.
 */
export const aggregateTerraformModuleUsage = (
  declarations: readonly TerraformModuleDeclaration[],
): TerraformModuleUsage[] => {
  const groups = new Map<
    string,
    {
      moduleName: string;
      moduleType: "DX" | "Non-DX";
      repositories: Set<string>;
      sources: Map<string, number>;
      usageCount: number;
    }
  >();

  for (const declaration of declarations) {
    const moduleType = isDxTerraformModule(declaration.module)
      ? "DX"
      : "Non-DX";
    const moduleName = normalizeTerraformModuleName(declaration.module);
    const source = sourceSearchTerm(declaration.module);
    const key = `${moduleType}\u0000${moduleName}`;
    const entry = groups.get(key) ?? {
      moduleName,
      moduleType,
      repositories: new Set<string>(),
      sources: new Map<string, number>(),
      usageCount: 0,
    };

    entry.repositories.add(declaration.repository);
    entry.sources.set(source, (entry.sources.get(source) ?? 0) + 1);
    entry.usageCount += 1;
    groups.set(key, entry);
  }

  return [...groups.values()]
    .map((group) => ({
      module: group.moduleName,
      moduleType: group.moduleType,
      repositoryCount: group.repositories.size,
      sources: [...group.sources.entries()]
        .sort(
          ([leftName, leftCount], [rightName, rightCount]) =>
            rightCount - leftCount || leftName.localeCompare(rightName),
        )
        .map(([source]) => source),
      usageCount: group.usageCount,
    }))
    .sort(
      (left, right) =>
        right.repositoryCount - left.repositoryCount ||
        left.module.localeCompare(right.module),
    );
};
