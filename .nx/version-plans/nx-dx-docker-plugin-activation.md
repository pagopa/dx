---
"@pagopa/dx-mcpserver": patch
dx-metrics: patch
dx-metrics-import: patch
---

Activate `@pagopa/nx-dx-docker-plugin` in this repository, adding inferred
`docker:build`/`docker:push` targets for Docker-enabled apps. Legacy image names
are preserved through project-level Nx Docker release configuration.
