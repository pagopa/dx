# @pagopa/dx-tasks

Reusable task implementations and a small dispatcher for DX orchestration tools.

## Available tasks

| Task              | Description                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terraformPlan`   | Runs `terraform plan` for a module path, handles common flags, and masks sensitive output before printing it.                                      |
| `terraformPlanUpload` | Runs `terraformPlan` with a fixed output path, then uploads the resulting plan bundle (plan file, lock file, and module cache) to the same cloud storage backend used for the Terraform state, so it can be applied later by `terraformApply`. |
| `terraformApply`  | Downloads the plan bundle uploaded by `terraformPlanUpload` (recomputing its deterministic storage path from the Terraform backend state and the current CI run), applies it non-interactively, and deletes the remote bundle only after a **successful** apply.        |
| `renderReport`    | Reads the persisted reports under `.dx-tasks` and renders them in a target format (currently `markdown`) to stdout, using per-namespace renderers. |
| `prComment`       | Adds a comment to a GitHub pull request, optionally replacing existing comments that match a search pattern.                                       |
| `reportPrComment` | Renders persisted reports and posts the rendered Markdown as a GitHub pull request comment.                                                        |

## Dispatcher

Tasks are meant to run through a dispatcher. The dispatcher is responsible for decoding payloads, wiring the shared reporter context, and selecting the right task definition.

### Public API

- `createTaskDispatcher()` creates an empty dispatcher.
- `registerTask(task)` registers a task definition.
- `dispatchTask(name, payload)` decodes the payload and runs the matching task, returning `Promise<unknown>` because dispatch selects tasks dynamically by name.
- `@pagopa/dx-tasks/tasks` exports the built-in task definitions, such as `terraformPlanTask`.
- `createDefaultTaskDispatcher()` creates a dispatcher with the built-in tasks already registered.

### Default dispatcher example

Here we create one shared report store, inject it when creating the default dispatcher, and dispatch `terraformPlan` with reporting enabled.

```ts
import {
  createDefaultTaskDispatcher,
  ReportStore,
  terraformPlanReportNamespace,
} from "@pagopa/dx-tasks";

const reports = new ReportStore(process.cwd()).register(
  terraformPlanReportNamespace,
);
const dispatcher = createDefaultTaskDispatcher({ reports });

await dispatcher.dispatchTask("terraformPlan", {
  modulePath: "./infra/modules/example",
  out: "plan.tfplan",
  refresh: true,
  report: true,
  verbose: false,
});
```

This prints the masked Terraform output to stdout and writes the JSON report under:

```text
.dx-tasks/terraform-plan/Li9pbmZyYS9tb2R1bGVzL2V4YW1wbGU.json
```

The `terraform-plan` namespace is registered once on the shared report store, so other tasks can safely reuse the same `ReportStore` instance without overwriting each other's reports.

### Custom dispatcher example

If you want to control which built-in tasks are available, register them explicitly from `@pagopa/dx-tasks/tasks`.

```ts
import {
  createTaskDispatcher,
  ReportStore,
  terraformPlanReportNamespace,
} from "@pagopa/dx-tasks";
import { terraformPlanTask } from "@pagopa/dx-tasks/tasks";

const reports = new ReportStore(process.cwd()).register(
  terraformPlanReportNamespace,
);
const dispatcher = createTaskDispatcher({
  context: { reports },
});

dispatcher.registerTask(terraformPlanTask);

await dispatcher.dispatchTask(terraformPlanTask.name, {
  modulePath: "./infra/modules/example",
  report: true,
});
```

For payload details and task-specific behavior, see the task definitions and implementations in `src/`.

## Terraform plan upload and apply

`terraformPlanUpload` and `terraformApply` implement a two-phase, plan-then-apply flow for Terraform
projects that must be applied non-interactively (e.g. from CI), while still guaranteeing that
`terraformApply` applies exactly what `terraformPlanUpload` planned:

1. `terraformPlanUpload` runs `terraform plan -out=<fixed path>` (reusing `terraformPlan`), then
   bundles the plan file together with `.terraform.lock.hcl` and `.terraform/modules/`, and uploads
   the bundle to the same cloud storage backend already used for the Terraform state (Azure Blob or
   S3, detected from `.terraform/terraform.tfstate`). The remote path is deterministic, derived from
   the backend state key and the `GITHUB_RUN_ID` environment variable.
2. `terraformApply` independently recomputes that same deterministic path (reading the same
   `.terraform/terraform.tfstate` and the same `GITHUB_RUN_ID`), downloads and extracts the bundle,
   runs `terraform apply` non-interactively against the exact downloaded plan file, and deletes the
   remote bundle only after a **successful** apply. On failure, the bundle is deliberately left in
   place: a re-run of the same workflow run's apply job can retry against the exact reviewed plan,
   and the bundle remains available for forensic inspection. Bundles left behind by abandoned or
   failed workflow runs are not cleaned up automatically and rely on the storage backend's own
   retention/lifecycle policy.

Because the remote path is derived deterministically rather than passed explicitly between steps,
the two tasks can run in separate CI jobs — even with different cloud credentials — as long as both
jobs run within the same workflow run (so `GITHUB_RUN_ID` matches) and against the same Terraform
backend state.

```ts
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks";

const dispatcher = createDefaultTaskDispatcher();

// In the "plan" job/step (read-only credentials):
await dispatcher.dispatchTask("terraformPlanUpload", {
  modulePath: "./infra/resources/dev",
  report: true,
});

// Later, in the "apply" job/step (write credentials, ideally gated behind a
// manual approval so the plan above can be reviewed first):
await dispatcher.dispatchTask("terraformApply", {
  modulePath: "./infra/resources/dev",
  report: true,
});
```

`terraformPlanUpload` and `terraformApply` both require the `GITHUB_RUN_ID` environment variable to
be set (this is set automatically by GitHub Actions runners).

## Commenting on pull requests

The `prComment` task creates a GitHub pull request comment. Pass explicit repository and PR
coordinates, direct Markdown content, and optionally a title rendered as an H2 before the body, a
Markdown footer rendered after a `---` separator, or a search pattern to delete matching older
comments before creating the new one.

```ts
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks";

const dispatcher = createDefaultTaskDispatcher();

await dispatcher.dispatchTask("prComment", {
  commentBody: "### Build Results\n\nBuild completed successfully.",
  footer: "_Generated by dx-tasks_",
  githubToken: process.env.GITHUB_TOKEN,
  issueNumber: 123,
  owner: "pagopa",
  repo: "dx",
  searchPattern: "Build Results",
  title: "Build Results",
});
```

If `githubToken` is omitted, the task reads `GITHUB_TOKEN` from the environment.

## Posting rendered reports on pull requests

The `reportPrComment` task combines report rendering with pull request commenting. Use it as the
final orchestration step after all report-producing tasks have completed.

```ts
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks";

const dispatcher = createDefaultTaskDispatcher();

await dispatcher.dispatchTask("reportPrComment", {
  footer: "_Generated by dx-tasks_",
  githubToken: process.env.GITHUB_TOKEN,
  issueNumber: 123,
  owner: "pagopa",
  repo: "dx",
  searchPattern: "<!-- dx-report -->",
  sourceUrl: "https://github.com/pagopa/dx/actions/runs/123456",
  title: "Terraform Plan",
});
```

If `title` is provided, the rendered report is posted after a `##` heading with that title. If
`footer` is provided, it is posted after the rendered report with a `---` separator. If the rendered
report is empty, the task skips comment creation and returns `undefined`. If `sourceUrl` is provided,
report renderers can use it to link back to the source workflow run or artifact. If `githubToken` is
omitted, the task reads `GITHUB_TOKEN` from the environment through the underlying `prComment`
implementation.

## Rendering reports

The `renderReport` task is the inverse of the `ReportStore`: it reads the JSON artifacts written under
`.dx-tasks` and renders them in a target format (currently `markdown`) to stdout.

Rendering is modular and **format-aware**: each report `namespace` registers a renderer for a
specific `(namespace, format)` pair through the `ReportStore`. Namespaces found on disk with no
renderer registered for the requested format are skipped, so an empty registry produces empty
output.

```ts
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks";

const dispatcher = createDefaultTaskDispatcher();

// Prints the merged Markdown of every report under .dx-tasks that has a
// registered "markdown" renderer (e.g. terraform-plan).
await dispatcher.dispatchTask("renderReport", { format: "markdown" });
```

The default dispatcher pre-registers the built-in `terraform-plan` Markdown renderer, which
receives all Terraform plan reports and produces one status title per module. Terraform warnings
and errors are rendered as GitHub Markdown notices before the summary line. Full plan outputs are
never included in the Markdown comment, keeping comments compact even across many plans and linking
back to `sourceUrl`, when provided, and report artifacts for the complete output.

````markdown
### Terraform Plans

#### Module: `./infra/modules/example` - ✅ Success

> [!WARNING]
> Warning: Deprecated attribute
>
> The attribute "foo" is deprecated.

Plan: 0 to add, 1 to change, 0 to destroy.

> [!NOTE]
> Full plan output is not included in this comment.
> See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.
````

To control which namespaces/formats are renderable, build your own `ReportStore` and register
namespaces with `renderers` explicitly:

```ts
import {
  createTaskDispatcher,
  ReportStore,
  terraformPlanReportNamespace,
} from "@pagopa/dx-tasks";
import { renderReportTask } from "@pagopa/dx-tasks/tasks";

const reports = new ReportStore(process.cwd()).register(
  terraformPlanReportNamespace,
);

const dispatcher = createTaskDispatcher({ context: { reports } });
dispatcher.registerTask(renderReportTask);

await dispatcher.dispatchTask(renderReportTask.name, { format: "markdown" });
```
