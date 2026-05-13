# opa-poc — Can OPA replace our Terraform modules and our custom provider _for AI-driven IaC_?

This PoC asks a focused question:

> **Instead of teaching a generative-AI agent our custom Terraform modules
> and our custom `dx` provider, can we publish OPA policies as the contract
> and let the AI author plain `azurerm_*` Terraform in any consumer repo,
> using those policies to verify the result?**

The short answer is **yes**, with two non-trivial caveats (module
configuration matrices like `use_case` and cross-resource composition).
The full reasoning, with concrete examples and a per-feature gap
analysis — including a worked example of porting `use_case` to a Rego
matrix — is in [`FINDINGS.md`](FINDINGS.md).

---

## What this PoC contains

| Path                                                             | What                                                                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`policies/lib/naming.rego`](policies/lib/naming.rego)           | Naming convention extracted from the custom Go provider's `resource_name` function.                                  |
| [`policies/storage_account.rego`](policies/storage_account.rego) | 8 generic rules extracted from the [`azure_storage_account`](../infra/modules/azure_storage_account/) module.        |
| [`policies/use_case.rego`](policies/use_case.rego)               | The full `use_case` matrix (development / default / audit / delegated_access / archive) expressed as policy data.    |
| [`policies/function_app.rego`](policies/function_app.rego)       | 9 rules extracted from the [`azure_function_app`](../infra/modules/azure_function_app/) module.                      |
| [`policies/cross_resource.rego`](policies/cross_resource.rego)   | Invariants that span multiple resources (e.g. function app → storage uses MSI).                                      |
| [`terraform/compliant/`](terraform/compliant/)                   | A plain-azurerm TF project that mirrors the module topology and is OPA-clean.                                        |
| [`terraform/non-compliant/`](terraform/non-compliant/)           | The same shape, deliberately broken in many ways — used to demonstrate targeted policy failures on a realistic plan. |
| [`terraform/dx-modules/`](terraform/dx-modules/)                 | The same intent authored with the `pagopa-dx/*` Terraform modules — included for visual comparison.                  |

---

## Run it

Tools required: `terraform`, `opa`, `conftest`, `regal`.

The PoC no longer ships fake plans or fixtures: every command below runs a
real `terraform plan`, exports it to JSON, and feeds that JSON to OPA.
Azure credentials are therefore required (`az login` + `ARM_SUBSCRIPTION_ID`).

```bash
make test    # opa unit tests on every policy
make demo-module         # ┐
make demo-compliant      # ├ esegue terraform plan + conftest sui progetti reali
make demo-non-compliant  # ┘
make compare # plan summaries for compliant vs dx-modules
make lint    # regal linter
make ci      # everything above
```

> `terraform apply` is **never** invoked. The demo only goes as far as
> `terraform plan`, exports it to JSON and feeds it to OPA/conftest.

---

## Why this PoC exists, in one paragraph

The DX modules do three things at once: (1) they **enforce** safe defaults
(TLS 1.2, public network off, auth, …), (2) they **compose** related
resources (a function app drags in a storage account, an App Service Plan,
private endpoints, DNS records, role assignments, alerts, …), and (3) they
**name** everything via the custom `provider::dx::resource_name(...)` function.
For an LLM authoring infrastructure in a downstream repo, the modules are a
hostile context. Publishing the **rules** instead of the **API** —
the same rules, expressed as Rego policies — turns the AI loop into something
model-friendly: write plain HCL, run `conftest`, read structured `deny`
messages, patch, repeat.
