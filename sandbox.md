Problem

Design a `dx-cli` sandbox mode exposed with a `--dry-run` flag so developers can execute `dx init` and `dx add environment` end-to-end without side effects on real GitHub or Azure, while reusing the same architecture for automated tests that must keep Plop real and fake only peripheral services.

Current state

- The CLI entrypoint builds real runtime dependencies in `apps/cli/src/index.ts`, including real GitHub PAT resolution, Octokit, and Azure-backed authorization.
- The entrypoint **hard-asserts** a valid PAT exists (`assert.ok(auth, ...)`) before any command runs — dry-run must bypass this.
- The root Commander program in `apps/cli/src/adapters/commander/index.ts` only exposes `--verbose`; there is no global execution mode concept yet.
- `init` and `add environment` in `apps/cli/src/adapters/commander/commands/` are tightly coupled to real preconditions, real shell side effects, and real generator execution.
- `apps/cli/src/adapters/plop/index.ts` still instantiates real `Octokit`, `AzureCliCredential`, `AzureSubscriptionRepository`, and `AzureCloudAccountService` inside the Plop wiring.
- The monorepo generator creates a **second, separate** Octokit instance (`new Octokit({ auth: process.env.GITHUB_TOKEN })` in `setMonorepoGenerator`) used for `fetchGithubRelease` actions.
- The environment generator actions use `process.cwd()` directly for destination paths, and the `init` command mutates it with `process.chdir(payload.repoName)`.
- Existing tests already validate real Plop generators with mocked services, but there is no executable sandbox mode for developers to explore new features interactively.

Design decisions (resolved)

| #   | Question                                            | Decision                                                                                          |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | PAT requirement in dry-run mode                     | **Skip entirely** — `--dry-run` works without GitHub credentials                                  |
| 2   | Local preconditions (terraform, corepack, az login) | **Injectable** — real checks in CLI dry-run, fake pass-through in tests                           |
| 3   | `fetchGithubRelease` (read-only network call)       | **Fake** — return deterministic version strings (e.g. `"22.0.0"`)                                 |
| 4   | Working directory for sandbox file output           | **Injected basePath context** — Plop destinations read from injected context, not `process.cwd()` |
| 5   | Initial sandbox state shape                         | **Configurable via fixture files** — developer selects a scenario                                 |

Proposed approach

Introduce a first-class execution mode abstraction for `dx-cli`:

1. Add a global `--dry-run` mode to the Commander root.
2. Build a `CliRuntime` / execution context at the entrypoint, so commands and Plop wiring consume injected ports instead of creating real adapters internally.
3. Keep Plop, prompts, templates, and filesystem rendering real.
4. Replace only the peripheral systems in dry-run mode:
   - GitHub service → local stateful fake
   - Cloud account repository/service → local stateful fake
   - Shell side effects that publish remotely (`terraform apply`, `git push`, PR creation) → dry-run implementations that update local sandbox state
   - `fetchGithubRelease` → deterministic stub returning fixed version strings
   - `AuthorizationService.requestAuthorization` → fake that logs the PR that _would_ be created
5. Reuse the same dry-run runtime in tests, so high-value integration tests execute real commands and generators while inspecting local sandbox state and rendered files.

Architecture outline

```
CliRuntime
├── mode: "normal" | "dry-run"
├── basePath: string                    // cwd for normal, tmpdir for dry-run
├── dependencies: Dependencies          // existing domain ports
├── plopDependencies: PlopDependencies  // replaces inline construction
├── preconditions: Preconditions        // injectable check functions
├── workspaceEffects: WorkspaceEffects  // git/terraform shell side effects
└── sandboxState?: SandboxState         // only present in dry-run mode
```

- `GlobalOptions`
  - add `dryRun?: boolean`
- `CliRuntime`
  - `mode`: execution mode discriminator
  - `basePath`: root path for file generation (replaces `process.cwd()` in generators)
  - `dependencies`: existing domain dependencies (GitHubService, AuthorizationService, etc.)
  - `plopDependencies`: injected factories for Plop action types (replaces inline Octokit/Azure construction)
  - `preconditions`: injectable check functions (allow tests to stub, CLI to run real)
  - `workspaceEffects`: git init/push, terraform init/apply, etc.
  - `sandboxState`: optional, present only in dry-run mode
- `PlopDependencies`
  - injected `GitHubService`
  - injected `CloudAccountRepository`
  - injected `CloudAccountService`
  - injected `releaseResolver` (replaces `fetchGithubRelease`)
- `WorkspaceEffects`
  - `createRemoteRepository(payload)` → real: terraform init+apply; dry-run: log + sandbox state
  - `initializeGitRepository(repo)` → real: git init/push; dry-run: log
  - `createPullRequest(params)` → delegates to GitHubService (already injected)
- `Preconditions`
  - `checkTerraform()` → real: shell check; test: no-op
  - `checkCorepack()` → real: shell check; test: no-op
  - `checkAzLogin()` → real: shell check; test: no-op
- `SandboxState`
  - repositories, branches, files, PRs, environment secrets
  - cloud accounts (loaded from fixture files), initialization status, terraform backend availability
  - operation log for developer inspection and test assertions
- `SandboxFixture` (JSON/TS files in `apps/cli/src/testing/fixtures/`)
  - defines initial cloud accounts, subscriptions, runner app credentials
  - developer selects a scenario at CLI invocation or test setup

Execution model

- Normal mode:
  - keep current behavior exactly as-is
  - real preconditions, real adapters, real remote side effects
- Dry-run mode:
  - **No credentials required** — PAT resolution is skipped
  - Commands still execute through Commander and Plop
  - Prompts remain interactive (future non-interactive mode is out of scope)
  - Files are generated for real inside an isolated sandbox workspace (`os.tmpdir()` by default, or explicit `--sandbox-dir`)
  - Plop action destinations use `runtime.basePath` instead of `process.cwd()`
  - Remote calls are redirected to stateful local doubles backed by `SandboxState`
  - Spinner/ora output is suppressed in test harness (kept in CLI dry-run for UX)
  - Summary output clearly indicates "🧪 DRY-RUN" execution

Testing strategy

- Keep unit tests for helpers and schemas (unchanged).
- Keep existing generator rendering tests with real Plop (unchanged).
- Add sandbox integration tests that:
  - build a dry-run runtime with a selected fixture
  - execute `init` / `add environment` through the same orchestration path as production
  - assert both rendered filesystem output and sandbox state transitions (e.g., PR creation was logged)
- Use scenario fixtures to seed fake GitHub / fake Azure state for deterministic test cases.
- Preconditions are stubbed in integration tests (no terraform/corepack dependency).

Implementation phases

1. **Refactor: extract Plop dependency construction** — refactor `adapters/plop/index.ts` and `setMonorepoGenerator`/`setDeploymentEnvironmentGenerator` to accept injected dependencies instead of creating them inline. Pure refactor, no behavior change, enables everything else.
2. **Refactor: extract workspace effects** — pull `createRemoteRepository`, `initializeGitRepository` out of `init.ts` into a `WorkspaceEffects` port. Same for authorization in `add.ts`. Pure refactor.
3. **Refactor: inject basePath** — replace `process.cwd()` usage in Plop action destinations with an explicit basePath parameter threaded through the runtime.
4. **Feature: global `--dry-run` flag and runtime builder** — add the flag to Commander, introduce `CliRuntime` builder in `index.ts` that conditionally skips PAT, builds fakes, and selects basePath.
5. **Feature: sandbox state model and fake services** — implement `SandboxState`, `FakeGitHubService`, `FakeCloudAccountService`, `FakeCloudAccountRepository`, deterministic release resolver, and fixture loading.
6. **Feature: sandbox integration tests** — add tests that exercise full command flow with dry-run runtime.
7. **Feature: CLI dry-run UX** — summary output with "🧪 DRY-RUN" indicator, operation log display, `--sandbox-dir` flag for explicit path.
8. **Docs** — document how developers run and inspect sandbox executions locally.

Todos

- `plop-inject-deps`: Refactor `adapters/plop/index.ts` to accept injected GitHub/cloud/release dependencies instead of creating them internally. Includes both the monorepo generator (Octokit for releases) and environment generator (AzureCliCredential, subscriptions, cloud service).
- `extract-workspace-effects`: Extract `createRemoteRepository`, `initializeGitRepository` from `init.ts` into a `WorkspaceEffects` interface. Extract authorization side effects from `add.ts`.
- `inject-base-path`: Replace `process.cwd()` in environment generator `actions.ts` and `process.chdir()` in `init.ts` with an explicit `basePath` threaded via runtime context.
- `cli-runtime-builder`: Introduce `CliRuntime` type and builder in `apps/cli/src/runtime.ts` that selects real vs dry-run adapters based on `--dry-run` flag.
- `cli-global-dry-run`: Add `--dry-run` to Commander global options; skip PAT assertion when active; wire flag into runtime construction.
- `sandbox-state-model`: Create `SandboxState` with operation log, plus fixture loader for configurable initial state.
- `fake-services`: Implement `FakeGitHubService`, `FakeCloudAccountRepository`, `FakeCloudAccountService`, deterministic release resolver. All backed by `SandboxState`.
- `injectable-preconditions`: Make precondition checks injectable in the runtime (real in normal/dry-run CLI, no-op in test harness).
- `sandbox-integration-tests`: Add tests that execute commands/generators with dry-run runtime and assert filesystem plus sandbox state.
- `sandbox-cli-ux`: Dry-run summary banner, operation log display, `--sandbox-dir` option.
- `sandbox-docs`: Document how developers run and inspect sandbox executions locally.

Notes

- Dry-run writes generated files to an isolated sandbox workspace by default (`os.tmpdir()/dx-sandbox-<id>/`).
- The initial version optimizes for safety and reproducibility over convenience in-place.
- `--dry-run` and `--verbose` are independent flags; both can be active simultaneously.
- Future work (out of scope): non-interactive mode (`--yes` / `--defaults`), fixture editor CLI.
