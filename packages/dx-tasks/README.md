# @pagopa/dx-tasks

Reusable task implementations and a small dispatcher for DX orchestration tools.

## Available tasks

| Task | Description |
| --- | --- |
| `terraformPlan` | Runs `terraform plan` for a module path, handles common flags, and masks sensitive output before printing it. |

## Dispatcher

Tasks are meant to run through a dispatcher. The dispatcher is responsible for decoding payloads, wiring the shared reporter context, and selecting the right task definition.

### Public API

- `createTaskDispatcher()` creates an empty dispatcher.
- `registerTask(task)` registers a task definition.
- `dispatchTask(name, payload)` decodes the payload and runs the matching task.
- `@pagopa/dx-tasks/tasks` exports the built-in task definitions, such as `terraformPlanTask`.
- `createDefaultTaskDispatcher()` creates a dispatcher with the built-in `terraformPlan` task already registered.

### Default dispatcher example

Here we create one shared reporter, inject it when creating the default dispatcher, and dispatch `terraformPlan` with reporting enabled.

```ts
import {
  createDefaultTaskDispatcher,
  Reporter,
} from "@pagopa/dx-tasks";

const reporter = new Reporter(process.cwd());
const dispatcher = createDefaultTaskDispatcher({ reporter });

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

The `terraform-plan` namespace is registered once on the shared reporter, so other tasks can safely reuse the same `Reporter` instance without overwriting each other's reports.

### Custom dispatcher example

If you want to control which built-in tasks are available, register them explicitly from `@pagopa/dx-tasks/tasks`.

```ts
import { createTaskDispatcher, Reporter } from "@pagopa/dx-tasks";
import { terraformPlanTask } from "@pagopa/dx-tasks/tasks";

const reporter = new Reporter(process.cwd());
const dispatcher = createTaskDispatcher({
  context: { reporter },
});

dispatcher.registerTask(terraformPlanTask);

await dispatcher.dispatchTask(terraformPlanTask.name, {
  modulePath: "./infra/modules/example",
  report: true,
});
```

For payload details and task-specific behavior, see the task definitions and implementations in `src/`.
