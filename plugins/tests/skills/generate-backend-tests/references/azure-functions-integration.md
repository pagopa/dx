# Azure Functions integration additions

Prerequisites: read `azure-harness.md` and `azure-functions-harness.md`. This adds integration-only guidance.

## Layout

Keep the integration folder near the target app and separate helpers from assertions. Reuse repo conventions when stronger.

```text
src/
  integration/
    live/<scenario>.test.ts
    support/
      function-host.ts
      harness.ts
      stubs.ts
      cleanup.ts
```

- tests drive real scenarios
- `function-host.ts`/`app-runtime.ts` starts or attaches to the Functions runtime
- `harness.ts` owns Testcontainers dependencies, seed data, and read-back helpers
- `stubs.ts` owns outbound partner HTTP stubs

For Vitest, apply `shared-vitest-lifecycle.md`.

## Workflow

On top of the shared Azure/Functions harness:

1. Seed/read dependencies through raw SDK or protocol calls owned by integration support, not mock helpers.
2. Assert live response and contract-relevant side effects.
3. Keep focus on durable contract behavior, not helper calls.
4. Prefer one-time build in the explicit integration command rather than inside test bodies.

## Non-HTTP triggers

For queue, blob, timer, or broker triggers, prefer the real local trigger transport when honest.

- Use `/admin/functions/<name>` only as a diagnostic seam.
- A working admin invocation plus broken real trigger is a harness bug, not proof the narrower seam is good enough.
- See `azure-functions-harness.md` for queue encoding, poison queues, and binding quirks.

## Binding-output slice

When the contract is only "this Function emits the correct queue/blob/table output" and the full host adds noise, a real `InvocationContext` slice can be honest:

```ts
const context = new InvocationContext();
await handler(input, context);
expect(context.extraOutputs.get(queueOutput)).toEqual(expectedPayload);
```

Use this only for binding payload contracts; otherwise follow `integration-workflow.md`.

## Good final shape

A healthy suite has one explicit host boot path, shared emulator containers where useful, per-test disposable resources, local partner stubs as needed, and assertions on real responses/side effects without becoming a record-replay harness.
