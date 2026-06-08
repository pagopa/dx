# @pagopa/dx-tasks

Reusable task implementations and a small dispatcher for DX orchestration tools.

## Available tasks

| Task | Description |
| --- | --- |
| `terraformPlan` | Runs `terraform plan` for a module path, handles common flags, and masks sensitive output before printing it. |

## Usage

You can import a task directly when you want to call it from code. For example, import `terraformPlan` from the package and call it with the target module path:

```ts
import { terraformPlan } from "@pagopa/dx-tasks/terraform-plan";

await terraformPlan({
  modulePath: "./infra/modules/example",
  out: "plan.tfplan",
  refresh: true,
  verbose: false,
});
```

## Dispatcher

The library also exports a dispatcher for registering and running tasks by name from Nx, GitHub Actions, or another orchestrator.

### Public API

- `createTaskDispatcher()` creates an empty dispatcher.
- `registerTask(task)` registers a task definition.
- `dispatchTask(name, payload)` decodes the payload and runs the matching task.
- `createDefaultTaskDispatcher()` creates a dispatcher with the built-in `terraformPlan` task already registered.

### Example

Here we register `terraformPlan` and dispatch it by name.

```ts
import {
  createDefaultTaskDispatcher,
  terraformPlanTask,
} from "@pagopa/dx-tasks";

const dispatcher = createDefaultTaskDispatcher();

await dispatcher.dispatchTask(terraformPlanTask.name, {
  modulePath: "./infra/modules/example",
});
```

For payload details, runtime behavior, and any other task-specific notes, see the source code in `src/`.
