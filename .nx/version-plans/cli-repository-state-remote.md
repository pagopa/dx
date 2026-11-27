---
"@pagopa/dx-cli": patch
---

Migrate the Terraform state of `infra/repository` to the Azure backend during
the first `dx add environment`, and warn at the end of `dx init` that it is
temporary and local

Confirm the exact permanent destination before placement, validate repository
resources before copying, reject existing destination blobs, and serialize
concurrent migrations. Inspect and apply the same import plan. New state keys
include the prefix; existing backends and keys remain unchanged and are reported
accurately when adding later environments.
