# Azure Functions shared runtime harness

Use this reference when the system under test is a Node.js or TypeScript Azure Functions app.

Read `references/azure-harness.md` first. This file only covers the Azure Functions runtime concerns that are shared by both integration and record-replay work.

## When to read this

Read this after you have already decided that:

- the honest boundary is the local Functions host
- the target app is worth exercising through a real local Functions runtime
- the repository does not already offer a better local Functions harness to copy

If the repository already has a stronger Functions harness in another app, prefer reusing that local convention instead of this starter.

## Local Functions boundary

Prefer the real local Functions host or an equivalent containerized Functions runtime.

- Use the same route or trigger seam a real local caller would use.
- Keep the harness pointed at the runtime boundary rather than importing handlers directly.
- Reuse the repository's existing local Functions layout when one already exists.

## Shared Functions bootstrap workflow

1. Start or attach to the real local Functions runtime.
2. If no credible app container exists, allocate a free local port dynamically, build the app with the repository's real build command, and start `func start --port <dynamic-port>` with the current PATH preserved.
3. Wait for readiness by calling a real local Functions route or trigger seam, not just by checking that the port is open.
4. Drive the scenario through the real local Functions boundary.

## When not to force the full host

Sometimes an Azure Functions app constructs cloud clients or validates credentials at import time in ways that do not have a credible local equivalent. In that case, do not bend production code just to make `func start` pass.

- Keep the full host only for scenarios whose contract truly depends on route wiring, middleware, auth, or serialization and can boot honestly.
- Otherwise use a mixed integration suite: call the real wrapper or handler with real Azure SDK request or context objects, keep storage and queue side effects live, and stub only the truly external dependency.
- State plainly which scenarios run through the full host and which use narrower live slices, so the user can see the boundary choice was intentional rather than a silent downgrade.

## Functions-specific environment checklist

On top of the generic Azure env validation, verify the settings that are specific to the Functions host.

### Host settings

- `FUNCTIONS_WORKER_RUNTIME`
- `AzureWebJobsStorage`

### Binding settings

Use the same connection names the app already declares in `app.http`, `app.storageQueue`, `app.cosmosDB`, or equivalent binding configuration.

Examples:

- queue trigger connection name
- Cosmos trigger connection string setting
- blob or table storage connection setting

## Trigger isolation for HTTP-focused flows

If the selected scope is one HTTP flow but the app also starts queue, blob, or timer triggers, disable the unrelated functions when they would consume the emitted artifact you want to assert on or record.

- Azure Functions supports this through `AzureWebJobs.<FunctionName>.Disabled=true`.
- This is especially useful when an HTTP request emits a queue message or storage write that must remain observable.

If the workflow persists topology or cassette metadata, keep the disabled-function list there so the resulting harness explains why the output remained observable.

## Fallback snippet: function host wrapper

Use this only when there is no existing app container or stronger repository convention. This is the smallest useful wrapper around the real local Functions host:

```ts
import { spawn } from "node:child_process";

export class FunctionHost {
  constructor(
    private readonly cwd: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly port: number,
  ) {}

  get baseUrl() {
    return `http://127.0.0.1:${this.port}/api/`;
  }

  async start() {
    await run("pnpm", ["build"], this.cwd, this.env);
    this.child = spawn("func", ["start", "--port", String(this.port)], {
      cwd: this.cwd,
      env: this.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitUntilReady(() => fetch(new URL("v1/info", this.baseUrl)));
  }

  async stop() {
    this.child?.kill("SIGINT");
  }
}
```

The important idea is not the exact code. The important idea is:

- use the real `func start`
- preserve the current environment and PATH
- wait on a real probe
- stop the process cleanly
- keep the harness pointed at the runtime boundary rather than importing it directly

## Decision rule

If you are blocked on Azure Functions runtime wiring, use this starter.

If the repository already gives you a better pattern, especially a containerized app runtime, copy the repository pattern instead.
