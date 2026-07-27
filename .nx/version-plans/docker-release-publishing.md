---
docs: patch
"@pagopa/nx-dx-docker-plugin": patch
nx-release: patch
self-hosted-runner: patch
---

Fix Docker release publishing for container-only Nx projects. Persist image
versions in project metadata, support single-platform Buildx annotations, and
ensure the release action authenticates GHCR publishing. Improve self-hosted
runner image installation resilience and document the Docker-only release flow.
