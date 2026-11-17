---
dx-metrics-import: patch
dx-metrics: patch
"@pagopa/dx-mcpserver": patch
---

Bump dependencies and install pnpm from the `packageManager` field in the Docker
images, since Corepack is no longer bundled with Node.js 25 and later.
