# METADATA
# title: Terraform must not read Key Vault secrets via data source
# description: |
#   Reading Key Vault secrets through `data.azurerm_key_vault_secret` exposes plaintext secret values during Terraform evaluation.
# custom:
#   id: DX-TF-0001
#   avd_id: AVD-DX-0001
#   severity: HIGH
#   short_code: no-keyvault-secret-data-source
#   url: https://dx.pagopa.it/docs/terraform/custom-checks/avd-dx-0001
#   recommended_actions: Use runtime secret references or write-only secret patterns (e.g. value_wo) instead of reading secret values with Terraform data sources.
#   input:
#     selector:
#       - type: terraform-raw

package user.terraform.DXTF0001

import rego.v1

# Detects usage of data "azurerm_key_vault_secret" blocks in any module.
# In terraform-raw mode, Trivy exposes parsed blocks with:
#   block.kind = "data" | "resource"
#   block.type = the Terraform resource type (e.g. "azurerm_key_vault_secret")
#   block.__defsec_metadata = location information for result highlighting
deny contains res if {
  some mod in input.modules
  some block in mod.blocks
  block.kind == "data"
  block.type == "azurerm_key_vault_secret"

  msg := sprintf(
    "Use of data.azurerm_key_vault_secret.%s is forbidden. Use runtime secret resolution or write-only secret patterns (value_wo).",
    [block.name],
  )
  res := result.new(msg, block)
}
