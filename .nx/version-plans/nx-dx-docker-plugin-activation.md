---
"@pagopa/dx-mcpserver": patch
dx-metrics: patch
dx-metrics-import: patch
---

Activate `@pagopa/nx-dx-docker-plugin` in this repository, adding inferred
`docker:build`/`docker:push`/`package` targets for Docker-enabled apps.
Legacy image names are preserved via the new `nx.docker.repositoryName`
project-level override.
