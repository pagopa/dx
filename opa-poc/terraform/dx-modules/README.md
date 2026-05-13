# Comparison baseline built with DX modules

This folder is **for comparison only** — it shows what a semantically similar
infrastructure to [`../compliant/`](../compliant/) would look like if authored by a
human inside `pagopa/dx` (or in any DX-owned repository) using the
`pagopa-dx/*` Terraform modules instead of plain `azurerm_*` resources.

The current comparison shows that `dx-modules/` and `compliant/` now create the
same Azure resource types and counts. The remaining structural difference is
the extra `dx_available_subnet_cidr` helper resource used by the module-based
baseline to pick a free subnet range inside the existing VNet.

## Side-by-side summary

| Concern                      | `compliant/` (plain `azurerm_*`)    | `dx-modules/` (this folder)                             |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------- |
| Lines of HCL                 | a few hundred                       | ~50                                                     |
| Resources declared by author | 19 managed resources + data lookups | 3 data lookups + 1 helper resource + 1 module call      |
| Naming                       | author types each name correctly    | `provider::dx::resource_name(...)`                      |
| Safe defaults (TLS, MSI, …)  | author repeats every flag           | hard-coded inside the module                            |
| `use_case` matrix            | author picks each value by hand     | `use_case = "default"` in one line                      |
| Diagnostic settings, alerts  | author remembers to add them        | alerts are created; diagnostics depend on module inputs |
| AI-friendliness              | high (model knows `azurerm_*`)      | low (private API the model never saw)                   |
| Human authoring effort       | high                                | low                                                     |
