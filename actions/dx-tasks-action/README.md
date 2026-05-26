# DX Tasks Action

Dispatches `@pagopa/dx-tasks` tasks from GitHub Actions by passing a task name and a JSON payload.

## Inputs

- `task`: dx-tasks task name to dispatch.
- `payload`: JSON payload consumed by the selected task.

## Example

```yaml
- uses: pagopa/dx/actions/dx-tasks-action@main
  with:
    task: terraformPlan
    payload: >-
      {"modulePath":"infra/resources/example","refresh":false,"verbose":true}
```
