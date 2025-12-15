---
"@pagopa/dx-mcpprompts": patch
---

Remove useless `getPrompts` call in mcp-prompts package. The `getPrompts` function was called in the `index.ts` causing all applications importing it to run twice.
