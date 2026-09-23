---
modules-azure-core-infra: patch
---

Grant the Infra CI merged role the permissions Terraform needs to refresh Static Web Apps and App Configuration.

The `azurerm` provider reads the computed secrets of both resources on every plan (`staticSites/listSecrets` and `configurationStores/listKeys`), so once a repository creates a Static Web App or an App Configuration store, the next plan fails with a 403 under the Infra CI identity. Add the `PagoPA Static Web Apps List Secrets` role and the App Configuration `listKeys` action to `DX Infra CI Resource Groups`.
