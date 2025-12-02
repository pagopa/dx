---
"@pagopa/dx-cli": patch
---

Add the `execa` adapter to allow the execution of shell commands.

The new `executeCommand` function provides a simple Promise-based wrapper around `execa` that returns `"success"` for commands that exit with code 0, or `"failure"` for commands that exit with non-zero codes or fail to execute.

Example usage:

```typescript
import { executeCommand } from "./adapters/execa/index.js";

const result = await executeCommand("ls", ["-la"], { cwd: "/tmp" });
if (result === "success") {
  console.log("Command executed successfully");
} else {
  console.log("Command failed");
}
```
