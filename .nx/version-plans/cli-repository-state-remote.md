---
'@pagopa/dx-cli': patch
---

Migrate the Terraform state of `infra/repository` to the Azure backend during
the first `dx add environment`, and warn at the end of `dx init` that it is
temporary and local
