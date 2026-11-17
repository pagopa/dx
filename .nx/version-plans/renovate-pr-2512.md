---
dx-metrics-import: patch
dx-metrics: patch
"@pagopa/dx-mcpserver": patch
---

Bump the Node.js base image to 26 and install pnpm from the `packageManager`
field, since Corepack is no longer bundled with Node.js 25 and later. The
Dockerfiles also copy `.pnpmfile.cjs` into the build context, as the lockfile
records its checksum and `--frozen-lockfile` refuses to run without it.
