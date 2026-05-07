# Nx Terraform Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inferred `nx-release-publish` support to `@pagopa/nx-terraform-plugin` so publishable Terraform libraries (with `module.json`) can publish/sync to GitHub subrepos in `github` mode, including auto-create when missing.

**Architecture:** Keep project discovery and dependency logic unchanged, then layer publishability inference on top of library projects only. Isolate publish concerns into focused modules: manifest/config parsing, GitHub repo management, and git subtree sync orchestration. Wire target inference to `nx-release-publish` and delegate version lifecycle to Nx Release.

**Tech Stack:** TypeScript, Nx plugin inference (`@nx/devkit`), Vitest, Node child process (`git`/`gh`), Zod.

---

### Task 1: Add publish config and manifest schemas

**Files:**
- Create: `packages/nx-terraform-plugin/src/publish/manifest.ts`
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
expect(parseModuleManifest({ version: "1.2.3", description: "x" }).version).toBe(
  "1.2.3",
);
expect(() => parseModuleManifest({ version: "1.2.3" })).toThrow(
  "Invalid module.json",
);
```

- [x] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL in new option/manifest assertions

- [x] **Step 3: Implement schema/types in focused files**

```ts
// packages/nx-terraform-plugin/src/publish/manifest.ts
const moduleManifestSchema = z.object({
  version: z.string().min(1),
  description: z.string().min(1),
  provider: z.string().min(1).optional(),
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
  packages/nx-terraform-plugin/src/publish/manifest.ts \
  packages/nx-terraform-plugin/src/__tests__/options.test.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-manifest.test.ts
git commit -m "Add publish and module manifest schemas"
```

### Task 2: Infer `nx-release-publish` only for publishable libraries

**Files:**
- Modify: `packages/nx-terraform-plugin/src/index.ts`
- Modify: `packages/nx-terraform-plugin/src/project.ts`
- Create: `packages/nx-terraform-plugin/src/publish/discovery.ts`
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
// packages/nx-terraform-plugin/src/publish/discovery.ts
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
  packages/nx-terraform-plugin/src/publish/discovery.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-discovery.test.ts
git commit -m "Infer nx-release-publish for publishable libraries"
```

### Task 3: Add publish runner entrypoint and execution contract

**Files:**
- Create: `tools/terraform-module-publish.mjs`
- Create: `packages/nx-terraform-plugin/src/publish/runtime.ts`
- Create: `packages/nx-terraform-plugin/src/__tests__/publish-runtime.test.ts`
- Modify: `packages/nx-terraform-plugin/src/project.ts`

- [ ] **Step 1: Write failing runtime contract tests**

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-runtime.test.ts
await expect(
  runPublish({
    projectRoot: "infra/modules/azure_core_infra",
    workspaceRoot: "/repo",
    publish: { mode: "github", github: { owner: "pagopa-dx" } },
  }),
).resolves.toEqual({ repo: "terraform-azurerm-azure-core-infra" });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because runtime and runner do not exist

- [ ] **Step 3: Implement runner and argument contract**

```js
// tools/terraform-module-publish.mjs
import { runPublishFromProcessArgs } from "../packages/nx-terraform-plugin/dist/publish/runtime.js";
await runPublishFromProcessArgs(process.argv.slice(2), process.cwd());
```

```ts
// packages/nx-terraform-plugin/src/publish/runtime.ts
export interface PublishRuntimeInput {
  workspaceRoot: string;
  projectRoot: string;
  publish: PublishOptions;
}
```

```ts
// packages/nx-terraform-plugin/src/project.ts target command
command:
  "node tools/terraform-module-publish.mjs --projectRoot={projectRoot} --workspaceRoot={workspaceRoot}",
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for runtime parsing and command contract

- [ ] **Step 5: Commit**

```bash
git add tools/terraform-module-publish.mjs \
  packages/nx-terraform-plugin/src/publish/runtime.ts \
  packages/nx-terraform-plugin/src/project.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-runtime.test.ts
git commit -m "Add nx-release-publish runtime entrypoint"
```

### Task 4: Implement GitHub repository ensure/create flow

**Files:**
- Create: `packages/nx-terraform-plugin/src/publish/github-client.ts`
- Create: `packages/nx-terraform-plugin/src/publish/repository.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts`

- [ ] **Step 1: Write failing tests for repo existence and auto-create**

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts
expect(await ensureRepository(client, { owner: "pagopa-dx", repo: "terraform-azurerm-x" }))
  .toEqual({ owner: "pagopa-dx", repo: "terraform-azurerm-x", created: false });

expect(await ensureRepository(clientMissing, { owner: "pagopa-dx", repo: "terraform-azurerm-x" }))
  .toEqual({ owner: "pagopa-dx", repo: "terraform-azurerm-x", created: true });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because ensure/create logic is missing

- [ ] **Step 3: Implement GitHub client and ensureRepository**

```ts
// packages/nx-terraform-plugin/src/publish/github-client.ts
export interface GithubClient {
  getRepo(owner: string, repo: string): Promise<"found" | "not-found">;
  createRepo(owner: string, repo: string): Promise<void>;
}
```

```ts
// packages/nx-terraform-plugin/src/publish/repository.ts
export const ensureRepository = async (client, { owner, repo }) => {
  const status = await client.getRepo(owner, repo);
  if (status === "found") return { owner, repo, created: false };
  await client.createRepo(owner, repo);
  return { owner, repo, created: true };
};
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for repository ensure/create behavior

- [ ] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/publish/github-client.ts \
  packages/nx-terraform-plugin/src/publish/repository.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-repository.test.ts
git commit -m "Add GitHub repository ensure and creation flow"
```

### Task 5: Implement subtree sync and publish orchestration

**Files:**
- Create: `packages/nx-terraform-plugin/src/publish/git.ts`
- Create: `packages/nx-terraform-plugin/src/publish/github-publisher.ts`
- Modify: `packages/nx-terraform-plugin/src/publish/runtime.ts`
- Test: `packages/nx-terraform-plugin/src/__tests__/publish-github-publisher.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

```ts
// packages/nx-terraform-plugin/src/__tests__/publish-github-publisher.test.ts
await publishToGithub(input, deps);
expect(deps.ensureRepository).toHaveBeenCalledWith(expect.objectContaining({ owner: "pagopa-dx" }));
expect(deps.runGit).toHaveBeenCalledWith([
  "subtree",
  "split",
  "--prefix=infra/modules/azure_core_infra",
  "-b",
  "azure_core_infra-branch",
]);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL because publish orchestrator is missing

- [ ] **Step 3: Implement orchestrator and git command layer**

```ts
// packages/nx-terraform-plugin/src/publish/git.ts
export type RunGit = (args: string[], cwd: string) => Promise<void>;
```

```ts
// packages/nx-terraform-plugin/src/publish/github-publisher.ts
await ensureRepository(client, { owner, repo });
await runGit(["remote", "add", remoteName, repoUrl], workspaceRoot);
await runGit(["subtree", "split", `--prefix=${modulePath}`, "-b", branch], workspaceRoot);
await runGit(["fetch", remoteName, "main", "--tags"], workspaceRoot);
await runGit(["merge", "--allow-unrelated-histories", "-s", "ours", "--no-edit", "temp-branch"], workspaceRoot);
await runGit(["push", remoteName, `${branch}:main`], workspaceRoot);
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS for orchestration sequence and input mapping

- [ ] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/publish/git.ts \
  packages/nx-terraform-plugin/src/publish/github-publisher.ts \
  packages/nx-terraform-plugin/src/publish/runtime.ts \
  packages/nx-terraform-plugin/src/__tests__/publish-github-publisher.test.ts
git commit -m "Orchestrate GitHub publish with subtree sync"
```

### Task 6: Wire docs/changelog and retire workflow usage path

**Files:**
- Modify: `packages/nx-terraform-plugin/src/index.ts`
- Modify: `packages/nx-terraform-plugin/CHANGELOG.md`
- Modify: `.github/workflows/_release-bash-modules-to-subrepo.yaml`
- Test: `packages/nx-terraform-plugin/src/__tests__/project.test.ts`

- [ ] **Step 1: Write failing regression test for workflow replacement boundary**

```ts
// packages/nx-terraform-plugin/src/__tests__/project.test.ts
expect(Object.keys(getTargetsOrThrow(getProject(defaultOptions, moduleRoot, true, true))))
  .toContain("nx-release-publish");
```

- [ ] **Step 2: Run tests to verify current gap**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: FAIL if final wiring or naming differs from plan

- [ ] **Step 3: Finalize wiring and deprecate direct module workflow**

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

```md
<!-- packages/nx-terraform-plugin/CHANGELOG.md -->
- Add inferred nx-release-publish target for publishable Terraform modules with module.json.
```

- [ ] **Step 4: Run full validation commands**

Run: `pnpm nx test nx-terraform-plugin --runInBand`  
Expected: PASS

Run: `pnpm nx lint nx-terraform-plugin`  
Expected: PASS

Run: `pnpm nx build nx-terraform-plugin`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/nx-terraform-plugin/src/index.ts \
  packages/nx-terraform-plugin/src/__tests__/project.test.ts \
  packages/nx-terraform-plugin/CHANGELOG.md \
  .github/workflows/_release-bash-modules-to-subrepo.yaml
git commit -m "Wire nx-release-publish and deprecate module workflow path"
```

### Task 7: Release integration verification for `azure_core_infra`

**Files:**
- Create: `infra/modules/azure_core_infra/module.json` (if missing)
- Test: release invocation command output (no repository file changes required if sample already exists)

- [ ] **Step 1: Write failing dry-run invocation expectation**

```bash
pnpm nx run modules-azure-core-infra:nx-release-publish --verbose
# Expected initially: FAIL with missing runtime integration detail, then fixed by previous tasks.
```

- [ ] **Step 2: Run publish target after implementation**

Run: `pnpm nx run modules-azure-core-infra:nx-release-publish --verbose`  
Expected: PASS (or explicit auth failure only when credentials are absent), with resolved repo name and owner

- [ ] **Step 3: Commit release integration adjustments**

```bash
git add infra/modules/azure_core_infra/module.json
git commit -m "Add module manifest for nx-release-publish validation"
```
