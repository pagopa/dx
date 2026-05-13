# terraform/

Three minimal Terraform projects used by the PoC for real plan generation,
visual comparison, and policy validation.

| Folder           | Built with            | Purpose                                                                                   | Expected OPA outcome  |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| `compliant/`     | plain `azurerm_*`     | Mirrors the safe defaults the dx module would enforce.                                    | ✅ pass               |
| `non-compliant/` | plain `azurerm_*`     | Same shape, deliberately broken in many ways.                                             | ❌ fail               |
| `dx-modules/`    | `pagopa-dx/*` modules | A semantically similar baseline a human inside `pagopa/dx` would author with the modules. | ✅ pass               |

The PoC now runs only on **real** Terraform plans. `make demo` in the parent
folder executes `terraform init`, `terraform plan`, `terraform show -json`, and
`conftest test` against `compliant/` and `non-compliant/`.

`dx-modules/` is the "if a human had used the modules" reference: open it
side-by-side with `compliant/main.tf` to see that the AI-authored plain-HCL
version targets the **same intent** as the module call, just more verbosely.
After the latest alignment pass, the two plans now create the same Azure
resource types and counts; the remaining structural gap is the extra
`dx_available_subnet_cidr` helper resource that exists only in the module-based
baseline.

> `terraform apply` is **never** invoked by the Makefile. Only `init` →
> `plan` → `show -json` → `conftest test`.
