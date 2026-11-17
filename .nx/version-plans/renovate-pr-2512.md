---
dx-metrics-import: patch
dx-metrics: patch
'@pagopa/dx-mcpserver': patch
---

Keep the Docker images on the Node.js 24 line, aligned with `.node-version` and
the CI toolchain, and install pnpm with `get-pnpm`, which resolves the version
from the `packageManager` field.

pnpm is bumped to 12.21.0 across the workspace. The Dockerfiles also copy
`.pnpmfile.cjs` into the build context, so `pnpm install --frozen-lockfile` no
longer fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` against the
`pnpmfileChecksum` stored in the lockfile.

The mcpserver Lambda extension moves to `aws-lambda-adapter` 1.1.0.
