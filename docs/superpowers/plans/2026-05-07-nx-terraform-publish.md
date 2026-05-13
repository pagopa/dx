# Nx Terraform Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inferred `nx-release-publish` support to `@pagopa/nx-terraform-plugin` so publishable Terraform libraries (with `module.json`) can publish exact module snapshots to dedicated GitHub repositories in `github` mode, including auto-create when missing.

**Architecture:** Keep project discovery and dependency logic unchanged, then layer publishability inference on top of library projects only. Isolate publish concerns into focused modules: manifest/config parsing, merged publish-option validation, GitHub repo management, and temporary export-repo orchestration. Wire target inference to `nx-release-publish`, pass parsed module manifests through discovery/project creation (instead of boolean-only state), build final publish options by merging plugin defaults with manifest values, and require the merged publish schema to pass both inference-time and executor-time validation.

**Tech Stack:** TypeScript, Nx plugin inference (`@nx/devkit`), Vitest, `execa`, Octokit, Zod, LogTape JSON Lines logging, generated JSON Schema artifact.

---

### Task 1: Add publish config and manifest schemas

**Files:**
- Create: `packages/nx-terraform-plugin/src/manifest.ts`
- Modify: `packages/nx-terraform-plugin/src/options.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/options.test.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts`

- [x] **Step 1: Write failing tests for option parsing and manifest validation**

```ts
// packages/nx-terraform-plugin/src/__tests__/options.test.ts
expect(parseOptions(undefined).publishTargetName).toBe("nx-release-publish");
expect(parseOptions(undefined).publish.mode).toBe("github");
expect(parseOptions(undefined).publish.github).toBeUndefined();

expect(() =>
  parseOptions({
    publish: { mode: "github", github: { owner: "" } },
  }),
).toThrow("Invalid Terraform plugin options");
```

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts
expect(
  parseModuleManifest({ version: "1.2.3", description: "x", provider: "aws" })
    .version,
).toBe("1.2.3");
expect(() => parseModuleManifest({ version: "1.2.3" })).toThrow(
  "Invalid module.json",
);
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL in new option/manifest assertions

- [x] **Step 3: Implement schema/types in focused files**

```ts
// packages/nx-terraform-plugin/src/manifest.ts
const moduleManifestSchema = z.object({
  version: z.string().min(1),
  description: z.string().min(1),
  provider: z.string().min(1),
  github: z.object({ owner: z.string().min(1).optional() }).optional(),
});
export type ModulePublishManifest = z.infer<typeof moduleManifestSchema>;
```

```ts
// packages/nx-terraform-plugin/src/options.ts (additions)
publishTargetName: targetNameSchema.default("nx-release-publish"),
publish: z.object({
  mode: z.literal("github").default("github"),
  github: z.object({ owner: z.string().min(1).optional() }).optional(),
}),
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for options + manifest tests

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/options.ts \
  packages/nx-terraform-plugin/src/manifest.ts \
  packages/nx-terraform-plugin/src/__tests__/options.test.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts
git commit -m "Add publish and module manifest schemas"
```

### Task 2: Infer `nx-release-publish` only for publishable libraries

**Files:**
- Modify: `packages/nx-terraform-plugin/src/index.ts`
- Modify: `packages/nx-terraform-plugin/src/project.ts`
- Create: `packages/nx-terraform-plugin/src/discovery.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/project.test.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-discovery.test.ts`

- [x] **Step 1: Write failing tests for target inference gate**

```ts
// packages/nx-terraform-plugin/src/__tests__/project.test.ts
expect(Object.keys(getProject(defaultOptions, moduleRoot, true, true).targets ?? {}))
  .toContain("nx-release-publish");

expect(Object.keys(getProject(defaultOptions, moduleRoot, true, false).targets ?? {}))
  .not.toContain("nx-release-publish");

expect(Object.keys(getProject(defaultOptions, appRoot, true, true).targets ?? {}))
  .not.toContain("nx-release-publish");
```

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-discovery.test.ts
expect(await hasPublishableModuleManifest(root)).toBe(true); // module.json exists + valid
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because publish gating is not implemented

- [x] **Step 3: Implement manifest-aware inference**

```ts
// packages/nx-terraform-plugin/src/discovery.ts
export const hasPublishableModuleManifest = async (root: string) => {
  const manifestPath = path.join(root, "module.json");
  const content = await fs.readFile(manifestPath, "utf-8");
  parseModuleManifest(JSON.parse(content));
  return true;
};
```

```ts
// packages/nx-terraform-plugin/src/index.ts (inside createNodes callback)
const hasPublishManifest =
  projectType === "library" && (await hasPublishableModuleManifest(absRoot));
projects[root] = getProject(opts, root, hasRootTflintConfig, hasPublishManifest);
```

```ts
// packages/nx-terraform-plugin/src/project.ts
if (projectType === "library" && hasPublishManifest) {
  targets.push([
    opts.publishTargetName,
    {
      cache: false,
      command: "node tools/terraform-module-publish.mjs",
      options: { cwd },
    },
  ]);
}
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for publish target inference rules

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/index.ts \
  packages/nx-terraform-plugin/src/project.ts \
  packages/nx-terraform-plugin/src/discovery.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-discovery.test.ts
git commit -m "Infer nx-release-publish for publishable libraries"
```

- [x] **Follow-up optimization: infer publishability from discovered `module.json` files**

Reworked `createNodesV2` discovery to scan with `**/*.{tf,module.json}` and derive
`publishableRoots` from discovered manifest paths, removing per-file filesystem
manifest reads during project graph creation.

- [x] **Follow-up refactor: flatten `src/publish/*` into `src/*`**

Moved manifest/discovery modules from `src/publish/` to `src/` and updated test
imports accordingly to keep publish-related logic colocated with the plugin core.

- [x] **Follow-up logging: emit invalid manifests as compact structured JSON**

The package logger now uses LogTape's JSON Lines formatter globally. Invalid
manifests discovered during inference are logged with:
- message: `Invalid manifest file`
- properties: `{ path, issues }`

The raw issue payload is kept on `ModulePublishManifestError.issues`, typed as
`z.core.$ZodIssue[]` to avoid the deprecated `ZodIssue` alias.

Logging ownership note:
- `src/logger.ts` now exposes both `getPackageLogger(...)` and
  `configureLogger()`.
- discovery and publish execution call `configureLogger()` before writing logs.
- helper modules still avoid embedding their own LogTape configuration.

- [x] **Follow-up consumer UX: generate JSON Schema for `module.json`**

`module.json` should expose a generated `module.schema.json` artifact for plugin
consumers. Keep the implementation minimal:
- add `packages/nx-terraform-plugin/src/generate-module-schema.ts`
- add a package script `generate`
- import `modulePublishManifestSchema`, convert it with Zod's JSON Schema API,
  extend the generated schema in the script so it accepts an optional top-level
  `$schema` property, and write
  `packages/nx-terraform-plugin/module.schema.json`
- keep Zod as the only runtime validator

- [x] **Follow-up behavior: add `terraform:public` tag for publishable modules**

Publishable library projects (those with valid `module.json` and inferred
`nx-release-publish`) now include tag `terraform:public` in addition to
`terraform`.

- [x] **Follow-up behavior: require manifest provider and remove provider default**

`module.json.provider` is now required for publishable manifests and no
`azurerm` fallback/default provider is assumed by executor behavior.

- [x] **Follow-up bugfix: validate publishable roots via manifest parser**

`createNodesV2` now validates discovered `module.json` roots through
`hasPublishableModuleManifest` before assigning publishability, so invalid
manifests do not infer `nx-release-publish` or `terraform:public`.

- [x] **Follow-up design alignment: carry parsed manifest in discovery state**

Discovery should parse `module.json` at detection time and pass parsed manifest
data to project creation/executor wiring, replacing boolean-only publishability
flags. This avoids mock-oriented validator indirection and keeps file-read +
schema-validation as a single source of truth.

Executor input contract:
- inferred target execution receives manifest metadata automatically from discovery
- direct `nx run ...:nx-release-publish` must provide manifest-derived metadata
  explicitly in options (no implicit fallback reads).

Implementation note:
- discovery now returns `publishableManifestByRoot` (parsed payload), and project
  target wiring passes flattened module properties (`description`, `provider`,
  `version`, optional `githubOwner`) into publish executor options.

### Task 2a: Generate consumer JSON Schema for `module.json`

**Files:**
- Create: `packages/nx-terraform-plugin/src/generate-module-schema.ts`
- Create: `packages/nx-terraform-plugin/module.schema.json`
- Modify: `packages/nx-terraform-plugin/package.json`
- Test: `packages/nx-terraform-plugin/src/__tests__/module-schema.test.ts`

- [x] **Step 1: Add minimal generator script**

```ts
// packages/nx-terraform-plugin/src/generate-module-schema.ts
// import modulePublishManifestSchema
// convert with Zod's JSON Schema API
// extend the generated schema to allow an optional top-level $schema property
// write module.schema.json
```

- [x] **Step 2: Add package script**

```json
{
  "scripts": {
    "generate": "node src/generate-module-schema.ts"
  }
}
```

- [x] **Step 3: Generate and commit `module.schema.json`**

The generated file should be treated as a consumer artifact derived from the
Zod schema, not as a second handwritten schema source. Keep the `$schema`
compatibility isolated to the generator output rather than broadening the
runtime Zod manifest schema.

### Task 3: Add publish runner entrypoint and execution contract

**Files:**
- Create: `tools/terraform-module-publish.mjs`
- Create: `packages/nx-terraform-plugin/src/publish/runtime.ts`
- Create: `packages/nx-terraform-plugin/src/__tests__/publish-runtime.test.ts`
- Modify: `packages/nx-terraform-plugin/src/project.ts`

- [x] **Step 1: Write failing runtime contract tests**

```ts
// packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts
expect(
  getRepoNameFromProjectRoot("infra/modules/azure_core_infra", "aws"),
).toBe("terraform-aws-azure-core-infra");
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because executor wiring/contract is not implemented

- [x] **Step 3: Implement runner and argument contract**

```bash
# generated via @nx/plugin
pnpm nx g @nx/plugin:executor packages/nx-terraform-plugin/src/executors/publish --name publish --unitTestRunner vitest
```

```ts
// packages/nx-terraform-plugin/src/project.ts target executor
executor: "@pagopa/nx-terraform-plugin:publish",
options: {
  projectRoot: "{projectRoot}",
  workspaceRoot: "{workspaceRoot}",
},
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for executor behavior and target wiring

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/executors.json \
  packages/nx-terraform-plugin/src/executors/publish \
  packages/nx-terraform-plugin/src/project.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts
git commit -m "Add nx-release-publish Nx executor"
```

### Task 4: Implement GitHub repository ensure/create flow

**Files:**
- Create: `packages/nx-terraform-plugin/src/github.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts`

- [x] **Step 1: Write failing tests for repo existence and auto-create**

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts
    expect(await ensureRepository(client, { owner: "pagopa-dx", repo: "terraform-aws-x" }))
      .toEqual({ owner: "pagopa-dx", repo: "terraform-aws-x", created: false });

    expect(await ensureRepository(clientMissing, { owner: "pagopa-dx", repo: "terraform-aws-x" }))
      .toEqual({ owner: "pagopa-dx", repo: "terraform-aws-x", created: true });
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because ensure/create logic is missing

- [x] **Step 3: Implement GitHub client and ensureRepository**

```ts
// packages/nx-terraform-plugin/src/github.ts
export interface GithubClient {
  getRepo(owner: string, repo: string): Promise<"found" | "not-found">;
  createRepo(owner: string, repo: string): Promise<void>;
}
```

```ts
// packages/nx-terraform-plugin/src/github.ts
export const ensureRepository = async (client, { owner, repo }) => {
  const status = await client.getRepo(owner, repo);
  if (status === "found") return { owner, repo, created: false };
  await client.createRepo(owner, repo);
  return { owner, repo, created: true };
};
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for repository ensure/create behavior

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/github.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts
git commit -m "Add GitHub repository ensure and creation flow"
```

### Task 5: Implement publish orchestration

**Files:**
- Create: `packages/nx-terraform-plugin/src/adapters/github/octokit.ts`
- Create: `packages/nx-terraform-plugin/src/adapters/github/publisher.ts`
- Modify: `packages/nx-terraform-plugin/src/executors/publish/publish.ts`
- Modify: `packages/nx-terraform-plugin/src/project.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/octokit.test.ts`
- Test: `packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/project.test.ts`

- [x] **Step 1: Write failing orchestration tests**

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-github-publisher.test.ts
await publishToGithub(input, deps);
expect(deps.ensureRepository).toHaveBeenCalledWith(expect.objectContaining({ owner: "pagopa-dx" }));
expect(deps.runGit).toHaveBeenCalledWith([
  "push",
  "origin",
  "HEAD:main",
  "--force",
]);
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because publish orchestrator is missing

- [x] **Step 3: Implement orchestrator and git command layer**

```ts
// packages/nx-terraform-plugin/src/adapters/github/octokit.ts
// concrete repository ensure/create implementation backed by Octokit
```

```ts
// packages/nx-terraform-plugin/src/adapters/github/publisher.ts
await ensureGitHubRepository({ owner, repo });
const exportDir = await mkdtemp(path.join(tmpdir(), "terraform-publish-"));
const export$ = $_({ cwd: exportDir });
await export$`git init --initial-branch=main`;
await copyModuleDirectory(modulePath, exportDir);
await export$`git add .`;
await export$`git commit -m "Updated module"`;
await export$`git remote add origin ${repoUrl}`;
await export$`git push origin HEAD:main --force`;
```

- [x] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for orchestration sequence and input mapping

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/adapters/github/octokit.ts \
  packages/nx-terraform-plugin/src/adapters/github/publisher.ts \
  packages/nx-terraform-plugin/src/executors/publish/publish.ts \
  packages/nx-terraform-plugin/src/project.ts \
  packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts \
  packages/nx-terraform-plugin/src/adapters/github/__tests__/octokit.test.ts \
  packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts
git commit -m "Orchestrate GitHub publish"
```

### Task 5a: Introduce required publish schema and merged validation helper

**Files:**
- Modify: `packages/nx-terraform-plugin/src/options.ts`
- Modify: `packages/nx-terraform-plugin/src/manifest.ts`
- Create: `packages/nx-terraform-plugin/src/publish-options.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/options.test.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts`

- [x] **Step 1: Write the failing schema/helper tests**

```ts
// packages/nx-terraform-plugin/src/__tests__/options.test.ts
expect(
  parseOptions({
    publish: { github: { owner: "pagopa-dx" } },
  }).publish.github?.owner,
).toBe("pagopa-dx");
```

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts
expect(
  mergePublishOptions(
    { github: { owner: "pagopa-dx" } },
    { description: "x", provider: "aws", version: "1.2.3" },
  ),
).toEqual({
  description: "x",
  github: { owner: "pagopa-dx" },
  provider: "aws",
  version: "1.2.3",
});

expect(() =>
  mergePublishOptions(
    {},
    { description: "x", provider: "aws", version: "1.2.3" },
  ),
).toThrow("Invalid publish options");
```

- [x] **Step 2: Run tests to verify they fail**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: FAIL because the required publish schema / merge helper does not exist yet

- [x] **Step 3: Write the minimal schema/helper implementation**

```ts
// packages/nx-terraform-plugin/src/publish-options.ts
export const publishSchema = z.object({
  description: z.string().min(1),
  github: z.object({ owner: z.string().min(1) }),
  provider: z.string().min(1),
  version: z.string().min(1),
});

export class PublishOptionsError extends Error {
  constructor(readonly issues: z.core.$ZodIssue[]) {
    super("Invalid publish options");
    this.name = "PublishOptionsError";
  }
}

export const pluginPublishOptionsSchema = publishSchema
  .pick({ github: true })
  .extend({
    github: z.object({ owner: z.string().min(1).optional() }).optional(),
  });

export const mergePublishOptions = (
  pluginPublishOptions: PluginPublishOptions,
  manifest: ModulePublishManifest,
) => {
  const parseResult = publishSchema.safeParse({
    ...pluginPublishOptions,
    ...manifest,
    github: {
      ...pluginPublishOptions.github,
      ...manifest.github,
    },
  });

  if (!parseResult.success) {
    throw new PublishOptionsError(parseResult.error.issues);
  }

  return parseResult.data;
};
```

```ts
// packages/nx-terraform-plugin/src/manifest.ts
export const modulePublishManifestSchema = publishSchema.extend({
  github: z.object({ owner: z.string().min(1).optional() }).optional(),
});
```

```ts
// packages/nx-terraform-plugin/src/options.ts
publish: z.object({
  mode: z.literal("github"),
  github: pluginPublishOptionsSchema.shape.github,
}),
```

- [x] **Step 4: Run tests to verify they pass**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: PASS with the new publish schema family and merged validation helper

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/options.ts \
  packages/nx-terraform-plugin/src/manifest.ts \
  packages/nx-terraform-plugin/src/publish-options.ts \
  packages/nx-terraform-plugin/src/__tests__/options.test.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts
git commit -m "Add merged publish options validation"
```

### Task 5b: Gate target inference with validated merged publish options

**Files:**
- Modify: `packages/nx-terraform-plugin/src/project.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/project.test.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/index.test.ts`

- [x] **Step 1: Write the failing inference/warning tests**

```ts
// packages/nx-terraform-plugin/src/__tests__/project.test.ts
expect(
  getProject(
    parseOptions({ publish: { mode: "github" } }),
    moduleRoot,
    true,
    validManifestWithoutOwner,
  ).targets?.["nx-release-publish"],
).toBeUndefined();
```

```ts
// packages/nx-terraform-plugin/src/__tests__/index.test.ts
expect(logtapeMocks.warn).toHaveBeenCalledWith(
  "Invalid publish options",
  expect.objectContaining({
    issues: [
      expect.objectContaining({
        path: ["github", "owner"],
      }),
    ],
    path: expect.stringContaining("module.json"),
  }),
);
```

- [x] **Step 2: Run tests to verify they fail**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: FAIL because project inference still treats `githubOwner` as optional

- [x] **Step 3: Write the minimal inference implementation**

```ts
// packages/nx-terraform-plugin/src/project.ts
try {
  const publishOptions = mergePublishOptions(opts.publish, publishManifest);
  targets.push([
    opts.publishTargetName,
    {
      cache: false,
      executor: "@pagopa/nx-terraform-plugin:publish",
      options: {
        ...publishOptions,
        githubOwner: publishOptions.github.owner,
        projectRoot: "{projectRoot}",
        workspaceRoot: "{workspaceRoot}",
      },
    },
  ]);
} catch (error) {
  logger.warn("Invalid publish options", {
    issues: error instanceof PublishOptionsError ? error.issues : [],
    path: path.join(root, "module.json"),
  });
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: PASS and modules missing both default owner and manifest owner skip publish target inference

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/project.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts \
  packages/nx-terraform-plugin/src/__tests__/index.test.ts
git commit -m "Validate merged publish options during inference"
```

### Task 5c: Revalidate required publish options in the executor

**Files:**
- Modify: `packages/nx-terraform-plugin/src/executors/publish/publish.ts`
- Test: `packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts`

- [x] **Step 1: Write the failing executor validation tests**

```ts
// packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts
await expect(
  executor({
    description: "x",
    projectRoot: "infra/modules/example",
    provider: "aws",
    version: "1.2.3",
    workspaceRoot: "/repo",
  }),
).resolves.toEqual({ success: false });

expect(logs.warn).toHaveBeenCalledWith(
  "Invalid publish options",
  expect.objectContaining({
    issues: [
      expect.objectContaining({
        path: ["github", "owner"],
      }),
    ],
  }),
);
```

- [x] **Step 2: Run tests to verify they fail**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: FAIL because the executor still treats `githubOwner` as optional

- [x] **Step 3: Write the minimal executor validation**

```ts
// packages/nx-terraform-plugin/src/executors/publish/publish.ts
await configureLogger();
const parseResult = nxReleasePublishExecutorSchema.safeParse(options);

if (!parseResult.success) {
  logger.warn("Invalid publish options", {
    issues: parseResult.error.issues,
    path: options.projectRoot ?? "publish options",
  });
  return { success: false };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test`  
Expected: PASS and the executor no longer silently skips publish when owner is missing

- [x] **Step 5: Run package verification**

Run: `NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:test && NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:lint && NX_DAEMON=false pnpm nx run @pagopa/nx-terraform-plugin:build --skipNxCache`  
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add packages/nx-terraform-plugin/src/executors/publish/publish.ts \
  packages/nx-terraform-plugin/src/executors/publish/publish.spec.ts
git commit -m "Require final publish options in executor"
```

### Task 5d: Support GitHub user and organization owners when creating repos

**Files:**
- Modify: `packages/nx-terraform-plugin/src/adapters/github/octokit.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/octokit.test.ts`

- [x] **Step 1: Write the failing owner-resolution tests**

```ts
// packages/nx-terraform-plugin/src/adapters/github/__tests__/octokit.test.ts
it("creates the repository in an organization when the owner is an org", async () => {
  octokitMocks.get.mockRejectedValueOnce(notFoundError);
  octokitMocks.getByUsername.mockResolvedValueOnce({ data: { login: "pagopa-dx", type: "Organization" } });

  await ensureGitHubRepository("pagopa-dx", "terraform-aws-x");

  expect(octokitMocks.createInOrg).toHaveBeenCalledWith({
    name: "terraform-aws-x",
    org: "pagopa-dx",
    visibility: "public",
  });
  expect(octokitMocks.createForAuthenticatedUser).not.toHaveBeenCalled();
});

it("creates the repository for the authenticated user when the owner is a user profile", async () => {
  octokitMocks.get.mockRejectedValueOnce(notFoundError);
  octokitMocks.getByUsername.mockResolvedValueOnce({ data: { login: "octocat", type: "User" } });
  octokitMocks.getAuthenticated.mockResolvedValueOnce({ data: { login: "octocat" } });

  await ensureGitHubRepository("octocat", "terraform-aws-x");

  expect(octokitMocks.createForAuthenticatedUser).toHaveBeenCalledWith({
    name: "terraform-aws-x",
    visibility: "public",
  });
  expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
});

it("fails explicitly when the requested user owner differs from the authenticated user", async () => {
  octokitMocks.get.mockRejectedValueOnce(notFoundError);
  octokitMocks.getByUsername.mockResolvedValueOnce({ data: { login: "octocat", type: "User" } });
  octokitMocks.getAuthenticated.mockResolvedValueOnce({ data: { login: "hubot" } });

  await expect(
    ensureGitHubRepository("octocat", "terraform-aws-x"),
  ).rejects.toThrow(
    "Cannot create repository for user owner \"octocat\" with authenticated user \"hubot\".",
  );
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `pnpm exec vitest run src/adapters/github/__tests__/octokit.test.ts`  
Expected: FAIL because the adapter still hardcodes `repos.createInOrg`

- [x] **Step 3: Implement minimal owner detection in the Octokit adapter**

```ts
// packages/nx-terraform-plugin/src/adapters/github/octokit.ts
const ownerResult = await octokit.rest.users.getByUsername({
  username: owner,
});

if (ownerResult.data.type === "Organization") {
  await octokit.rest.repos.createInOrg({
    name: repo,
    org: owner,
    visibility: "public",
  });
  return;
}

const authenticatedUser = await octokit.rest.users.getAuthenticated();
if (authenticatedUser.data.login !== owner) {
  throw new Error(
    `Cannot create repository for user owner "${owner}" with authenticated user "${authenticatedUser.data.login}".`,
  );
}

await octokit.rest.repos.createForAuthenticatedUser({
  name: repo,
  visibility: "public",
});
```

- [x] **Step 4: Run focused and package verification**

Run: `pnpm exec vitest run src/adapters/github/__tests__/octokit.test.ts && pnpm nx test nx-terraform-plugin && pnpm nx lint nx-terraform-plugin && pnpm nx build nx-terraform-plugin`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/adapters/github/octokit.ts \
  packages/nx-terraform-plugin/src/adapters/github/__tests__/octokit.test.ts
git commit -m "Support user-owned GitHub publish repos"
```

### Task 6: Wire docs/changelog and retire workflow usage path

**Files:**
- Modify: `packages/nx-terraform-plugin/src/index.ts`
- Create: `.nx/version-plans/version-plan-<timestamp>.md`
- Modify: `.github/workflows/_release-bash-modules-to-subrepo.yaml`
- Test: `packages/nx-terraform-plugin/src/__tests__/project.test.ts`

- [x] **Step 1: Write failing regression test for workflow replacement boundary**

```ts
// packages/nx-terraform-plugin/src/__tests__/project.test.ts
expect(Object.keys(getTargetsOrThrow(getProject(defaultOptions, moduleRoot, true, true))))
  .toContain("nx-release-publish");
```

- [x] **Step 2: Run tests to verify current gap**

Run: `pnpm nx test nx-terraform-plugin`  
Expected: PASS if wiring already matches the plan, or FAIL if final wiring or naming still differs

- [x] **Step 3: Finalize wiring and deprecate direct module workflow**

```yaml
# .github/workflows/_release-bash-modules-to-subrepo.yaml
on:
  workflow_dispatch:

jobs:
  deprecated:
    runs-on: ubuntu-latest
    steps:
      - run: |
           echo "This workflow is deprecated. Use nx-release-publish inferred targets from @pagopa/nx-terraform-plugin."
           exit 1
 ```

```bash
pnpm nx release plan
```

During the interactive prompt:

1. select `@pagopa/nx-terraform-plugin`
2. choose a `minor` bump
3. use this release note line:

```md
Add inferred nx-release-publish target for publishable Terraform modules with module.json.
```

Expected result: a new file is created under `.nx/version-plans/` and committed,
while `CHANGELOG.md` remains untouched because Nx Release pipelines will consume
the version plan and update changelogs later.

- [x] **Step 4: Run full validation commands**

Run: `pnpm nx test nx-terraform-plugin`  
Expected: PASS

Run: `pnpm nx lint nx-terraform-plugin`  
Expected: PASS

Run: `pnpm nx build nx-terraform-plugin`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/index.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts \
  .nx/version-plans/version-plan-*.md \
  .github/workflows/_release-bash-modules-to-subrepo.yaml
git commit -m "Wire nx-release-publish and deprecate module workflow path"
```

### Task 7: Release integration verification for `aws_azure_vpn`

**Files:**
- Create: `infra/modules/aws_azure_vpn/module.json` (if missing)
- Delete: `infra/modules/aws_azure_vpn/package.json` (if replacing legacy module metadata)
- Test: release invocation command output (no repository file changes required if sample already exists)

Because publish exports the current filesystem contents of the module directory,
the live publish run should reflect the working tree state under
`infra/modules/aws_azure_vpn`, even when those changes are not part of Git
history yet.

- [x] **Step 1: Write failing dry-run invocation expectation**

```bash
pnpm nx run modules-aws-azure-vpn:nx-release-publish --verbose
# Expected initially: FAIL with missing runtime integration detail, then fixed by previous tasks.
```

- [x] **Step 2: Run publish target after implementation**

Run: `pnpm nx run modules-aws-azure-vpn:nx-release-publish --verbose`  
Expected: PASS (or explicit auth failure only when credentials are absent), with
resolved owner `lucacavallaro` and destination repo
`terraform-aws-aws-azure-vpn`

- [x] **Step 3: Commit release integration adjustments**

```bash
git add infra/modules/aws_azure_vpn/module.json \
  infra/modules/aws_azure_vpn/package.json
git commit -m "Add module manifest for nx-release-publish validation"
```

### Task 7a: Make publish rerunnable and standardize on `$`

**Files:**
- Modify: `packages/nx-terraform-plugin/src/adapters/github/publisher.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`

- [x] **Step 1: Write failing repeatability and command-style tests**

```ts
// packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts
it("removes the temporary remote and subtree branch after a successful publish", async () => {
  const commands: string[] = [];
  const git$ = vi.fn(async (strings: TemplateStringsArray, ...values: string[]) => {
    commands.push(String.raw({ raw: strings }, ...values));
    return { exitCode: 0, stderr: "", stdout: "" };
  });

  execaMocks.$.mockReturnValue(git$);

  await publishToGithub({
    description: "Terraform module description",
    githubOwner: "pagopa-dx",
    projectRoot: "infra/modules/azure_core_infra",
    provider: "aws",
    version: "1.2.3",
    workspaceRoot: "/repo",
  });

  expect(commands).toContain(
    "git remote remove pagopa-dx-terraform-aws-azure-core-infra",
  );
  expect(commands).toContain("git branch -D azure_core_infra-branch");
});

it("still cleans up temporary git state when publish fails after creating it", async () => {
  const failure = Object.assign(new Error("push failed"), { exitCode: 1 });
  const commands: string[] = [];
  const git$ = vi.fn(async (strings: TemplateStringsArray, ...values: string[]) => {
    const command = String.raw({ raw: strings }, ...values);
    commands.push(command);
    if (command.startsWith("git push ")) {
      throw failure;
    }
    return { exitCode: 0, stderr: "", stdout: "" };
  });

  execaMocks.$.mockReturnValue(git$);

  await expect(
    publishToGithub({
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    }),
  ).rejects.toBe(failure);

  expect(commands).toContain(
    "git remote remove pagopa-dx-terraform-aws-azure-core-infra",
  );
  expect(commands).toContain("git branch -D azure_core_infra-branch");
});
```

- [x] **Step 2: Run focused test to verify RED**

Run: `pnpm exec vitest run packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`  
Expected: FAIL because publish does not yet guarantee best-effort cleanup and still
mixes raw `execa` into the command flow

- [x] **Step 3: Implement minimal publish cleanup and `$`-first command execution**

```ts
// packages/nx-terraform-plugin/src/adapters/github/publisher.ts
const $ = $_({ cwd: input.workspaceRoot });
const safe$ = $({ reject: false });

await ensureGitHubRepository(input.githubOwner, repo);

try {
  await $`git remote add ${remote} ${repoUrl}`;
  await $`git subtree split --prefix=${input.projectRoot} -b ${branch}`;

  const remoteMainBranch = await safe$`git ls-remote --exit-code --heads ${remote} refs/heads/main`;

  if (remoteMainBranch.exitCode === 0) {
    await $`git fetch ${remote} main --tags`;
    await $`git checkout ${branch}`;
    await $`git merge --allow-unrelated-histories -s ours --no-edit ${remote}/main`;
  } else if (remoteMainBranch.exitCode !== 2) {
    throw new Error(`Failed to check whether ${remote}/main exists...`);
  }

  await $`git push ${remote} ${branch}:main`;
} finally {
  await safe$`git remote remove ${remote}`;
  await safe$`git branch -D ${branch}`;
}
```

- [x] **Step 4: Run package verification**

Run: `pnpm exec vitest run packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts && pnpm nx test nx-terraform-plugin && pnpm nx lint nx-terraform-plugin && pnpm nx build nx-terraform-plugin`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/adapters/github/publisher.ts \
  packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts
git commit -m "Make publish rerunnable"
```

### Task 7b: Replace subtree publish with temporary export repo snapshots

**Files:**
- Modify: `packages/nx-terraform-plugin/src/adapters/github/publisher.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`

- [x] **Step 1: Write failing export-based publish tests**

```ts
const fsMocks = vi.hoisted(() => ({
  cp: vi.fn(),
  mkdtemp: vi.fn(),
  readdir: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  cp: fsMocks.cp,
  mkdtemp: fsMocks.mkdtemp,
  readdir: fsMocks.readdir,
  rm: fsMocks.rm,
}));

const createGitCommandHarness = ({
  exportDir,
  onExportCommand,
}: {
  exportDir: string;
  onExportCommand?: (
    command: string,
  ) => Promise<typeof defaultCommandResult> | typeof defaultCommandResult;
}) => {
  const workspaceCommands: string[] = [];
  const exportCommands: string[] = [];

  const workspace$ = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    workspaceCommands.push(String.raw(strings, ...values.map(String)));
    return Promise.resolve(defaultCommandResult);
  });

  const export$ = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const command = String.raw(strings, ...values.map(String));
    exportCommands.push(command);
    return Promise.resolve(onExportCommand?.(command) ?? defaultCommandResult);
  });

  execaMocks.$.mockImplementation((options?: { cwd?: string }) => {
    if (options?.cwd === exportDir) {
      return export$;
    }

    return workspace$;
  });

  return {
    allCommands: [...workspaceCommands, ...exportCommands],
    exportCommands,
    workspaceCommands,
  };
};

it("publishes from a temporary export repo with a single snapshot commit", async () => {
  fsMocks.mkdtemp.mockResolvedValue("/tmp/terraform-publish-123");
  fsMocks.readdir.mockResolvedValue([
    { name: "README.md", isDirectory: () => false },
    { name: "examples", isDirectory: () => true },
    { name: ".git", isDirectory: () => true },
  ]);

  const { workspaceCommands, exportCommands } = createGitCommandHarness({
    exportDir: "/tmp/terraform-publish-123",
  });

  await publishToGithub(publishInput);

  expect(fsMocks.cp).toHaveBeenCalledWith(
    "/repo/infra/modules/azure_core_infra/README.md",
    "/tmp/terraform-publish-123/README.md",
    { recursive: true },
  );
  expect(fsMocks.cp).toHaveBeenCalledWith(
    "/repo/infra/modules/azure_core_infra/examples",
    "/tmp/terraform-publish-123/examples",
    { recursive: true },
  );
  expect(exportCommands).toEqual([
    "git init --initial-branch=main",
    "git add .",
    'git commit -m Updated module',
    "git remote add origin https://github.com/pagopa-dx/terraform-aws-azure-core-infra.git",
    "git push origin HEAD:main --force",
  ]);
  expect(workspaceCommands).toEqual([]);
});

it("can publish from a dirty workspace because it does not checkout workspace branches", async () => {
  fsMocks.mkdtemp.mockResolvedValue("/tmp/terraform-publish-123");
  fsMocks.readdir.mockResolvedValue([]);

  const { allCommands } = createGitCommandHarness({
    exportDir: "/tmp/terraform-publish-123",
  });

  await publishToGithub(publishInput);

  expect(allCommands).not.toContain(
    "git subtree split --prefix=infra/modules/azure_core_infra -b azure_core_infra-branch",
  );
  expect(allCommands).not.toContain("git checkout azure_core_infra-branch");
  expect(allCommands).not.toContain("git branch -D azure_core_infra-branch");
});

it("removes the temporary export repo after a failed push", async () => {
  const pushFailure = new Error("push failed");

  fsMocks.mkdtemp.mockResolvedValue("/tmp/terraform-publish-123");
  fsMocks.readdir.mockResolvedValue([]);

  createGitCommandHarness({
    exportDir: "/tmp/terraform-publish-123",
    onExportCommand: (command) => {
      if (command === "git push origin HEAD:main --force") {
        return Promise.reject(pushFailure);
      }

      return defaultCommandResult;
    },
  });

  await expect(publishToGithub(publishInput)).rejects.toBe(pushFailure);
  expect(fsMocks.rm).toHaveBeenCalledWith("/tmp/terraform-publish-123", {
    force: true,
    recursive: true,
  });
});
```

- [x] **Step 2: Run focused test to verify RED**

Run: `pnpm exec vitest run packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`  
Expected: FAIL because publish still uses subtree/branch orchestration and does not manage a temp export repo

- [x] **Step 3: Replace subtree flow with temp export repo publish**

```ts
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const publishGitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "pagopa-dx publish",
  GIT_AUTHOR_EMAIL: "223556219+Copilot@users.noreply.github.com",
  GIT_COMMITTER_NAME: "pagopa-dx publish",
  GIT_COMMITTER_EMAIL: "223556219+Copilot@users.noreply.github.com",
};

const copyModuleDirectoryContents = async (
  sourceDirectory: string,
  targetDirectory: string,
) => {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.name !== ".git")
      .map((entry) =>
        cp(
          join(sourceDirectory, entry.name),
          join(targetDirectory, entry.name),
          { recursive: true },
        ),
      ),
  );
};

const exportDirectory = await mkdtemp(join(tmpdir(), "terraform-publish-"));
const export$ = $_({
  cwd: exportDirectory,
  env: publishGitEnv,
  shell: true,
});

try {
  await copyModuleDirectoryContents(
    join(input.workspaceRoot, input.projectRoot),
    exportDirectory,
  );
  await export$`git init --initial-branch=main`;
  await export$`git add .`;
  await export$`git commit -m ${"Updated module"}`;
  await export$`git remote add origin ${repoUrl}`;
  await export$`git push origin HEAD:main --force`;
} finally {
  await rm(exportDirectory, { recursive: true, force: true });
}
```

- [x] **Step 4: Run package verification**

Run: `pnpm exec vitest run packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts && pnpm nx test nx-terraform-plugin && pnpm nx lint nx-terraform-plugin && pnpm nx build nx-terraform-plugin`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/adapters/github/publisher.ts \
  packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts
git commit -m "Replace subtree publish with export snapshots"
```

Completed in:
- `5d4a7463` — `Replace subtree publish with export-repo approach`
- `98d85640` — `Handle Windows path separators in publisher`
- `a6e8251d` — `Enable shell mode for publish commits`

### Task 7c: Require semantic-version manifest versions

**Files:**
- Modify: `packages/nx-terraform-plugin/src/publish-options.ts`
- Modify: `packages/nx-terraform-plugin/package.json`
- Modify: `packages/nx-terraform-plugin/module.schema.json`
- Modify: `pnpm-lock.yaml`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/index.test.ts`

- [x] **Step 1: Add failing coverage for invalid and valid semver manifest versions**
- [x] **Step 2: Run focused test to verify RED**
- [x] **Step 3: Define `semverSchema` with Zod string format backed by the `semver` package**
- [x] **Step 4: Regenerate the emitted JSON schema so manifest version exposes `format: "semver"`**
- [x] **Step 5: Run package verification**
- [x] **Step 6: Commit**

Completed in:
- `86449d0d` — `Validate module.json version as strict semver`
- `0809a22c` — `Use Zod stringFormat for semver validation`

### Task 7d: Export version tags with published modules

**Files:**
- Modify: `packages/nx-terraform-plugin/src/adapters/github/publisher.ts`
- Test: `packages/nx-terraform-plugin/src/adapters/github/__tests__/publisher.test.ts`

- [x] **Step 1: Add failing coverage for publishing a version tag from the export repository**
- [x] **Step 2: Run focused test to verify RED**
- [x] **Step 3: Create the tag from `module.json.version` and force-push it after the snapshot commit**
- [x] **Step 4: Fail publish when the tag push fails, even if branch push already succeeded**
- [x] **Step 5: Run package verification**
- [x] **Step 6: Commit**

Completed in:
- `8923ea76` — `Add version tagging to module publisher`
