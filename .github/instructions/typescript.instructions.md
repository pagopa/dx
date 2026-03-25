---
description: This file describes the TypeScript code style for the project.
applyTo: "**/*.ts, **/*.js, package.json"
---

# Copilot Guidelines for TypeScript Code

## General Rules

- Use kebab-case for file and folder names.
- Use named exports; avoid default exports.
- Keep modules free of side effects: export values and functions without executing code at import time.
- Do not access `process.env` outside an entrypoint; pass configuration through parameters.
- Use `@pagopa/eslint-config` for consistent linting rules.
- Keep modules and functions small and single-responsibility. Methods should fit within a single screen.
- Adhere to Ports and Adapters Architecture by isolating implementation details within adapters and maintaining strict layering to prevent leaking implementation concerns.
- Do not create global utility or types packages; keep helpers and types close to where they are used.
- Avoid barrel files; import directly from source files.
- Use lint tasks to automate code styling and ordering; avoid manual fixes for imports or methods ordering.
- Avoid dynamic imports (`import()`) unless absolutely necessary for conditional loading.
- Add a short file header that states the module purpose and how it fits into the overall architecture.
- Prefer `const`, immutable structures, and pure functions over `let`/`var` mutations.
- Favor functional programming patterns for control flow over imperative statements. Anyway, don't force functional programming or other paradigms in areas where they add complexity: suitable for frontend or SDK layers, but not mandatory everywhere.
- Use `async/await` for asynchronous code for clarity.
- Document non-obvious decisions and the rationale (the "why") in comments.
- Use clear and descriptive names for all identifiers, avoiding abbreviations that obscure intent.

### Data Validation and Type Safety

**Always validate external inputs with zod:** API responses, environment variables, user input, database results, file contents.

**Zod rules:**

- New code: zod v4; existing code: keep current version until migrated
- Use `.safeParse()` and handle both success/failure paths
- Export schemas alongside inferred types

**Avoid casts for:** JSON parsing → zod, enum conversion → zod refinements, bypassing type errors → fix root cause

```ts
// ❌ Bad
const user = JSON.parse(data) as User;

// ✅ Good
const userSchema = z.object({ name: z.string(), email: z.string().email() });
const result = userSchema.safeParse(JSON.parse(data));
if (!result.success) {
  /* handle validation error */
}
```

### Error Handling

**Never silently ignore errors.** Only catch exceptions you can meaningfully handle. Propagate others and preserve the original error with `cause`.

```ts
// ❌ Bad: Silent failure
try {
  await fetchUser(id);
} catch {}

// ❌ Bad: Lost information
try {
  await fetchUser(id);
} catch (err) {
  throw new Error("Failed");
}

// ✅ Good: Only catch when you handle it
try {
  await cache.delete(key);
} catch (e) {
  console.warn("Cache cleanup failed", e);
}

// ✅ Good: Preserve original error
try {
  await fetchUser(id);
} catch (err) {
  throw new Error(`Failed to fetch user ${id}`, { cause: err });
}
```

- Avoid deeply nested control flow; prefer early returns or small helper functions.
- Use asynchronous functions for I/O-bound operations. Never use `writeFileSync` or similar blocking calls.
- Favor dependency injection over instantiating collaborators with `new` inside methods.
- Use ES Modules (`import`/`export`) and include `.js`/`.ts` extensions in new code.

## NodeJS

When coding for NodeJS environments:

- Always prefer NodeJS built-in modules over implementing custom logic (e.g., use `assert` module instead of writing custom assertion functions)
- Code for NodeJS must be compatible with the version specified in the root `.node-version` file

## Dependencies

- Use catalog versions from [pnpm-workspace.yaml](../../pnpm-workspace.yaml) for common packages
- Add dependencies: `pnpm --filter <workspace-name> add <package-name>`
- Add root-level dependencies: `pnpm add -w <package-name>`
