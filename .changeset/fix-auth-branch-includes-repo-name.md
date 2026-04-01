---
"@pagopa/dx-cli": patch
---

Include the project repository name in the branch name created on `eng-azure-authorization` when requesting Azure subscription authorization.

Previously the branch was named `feats/add-<subscription>-bootstrap-identity`, which caused a conflict when multiple teams initialized projects on the same Azure subscription at the same time.

The branch is now named `feats/add-<repo>-<subscription>-bootstrap-identity`, making it unique per (repository, subscription) pair.
