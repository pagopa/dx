---
docs: patch
---

Document hardened reusable workflow job permissions and checkout credential handling; forked Static Web App pull requests now build on hosted agents.

Callers must grant the reusable job `contents: read`, `packages: read`, `id-token: write` and `pull-requests: write` as applicable. The DX website caller already grants `packages: read`; external callers must do the same. Workflows are consumed through their existing refs and are not independent Nx release projects.

Git checkout credentials are no longer persisted for the affected build and static-analysis steps. Any subsequent authenticated Git operation must provide its own token explicitly.
