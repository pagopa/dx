# Signing secret for the repository-scope magic links.
#
# Anyone holding it can mint a link for any scope, including the full portfolio,
# so its value is set out of band and never reaches the repository or the
# Terraform state.
#
# Enforcement is on from the first apply, so the portal serves no data between
# this resource being created and the value being written. The sequence is:
#
#   terraform apply
#   az keyvault secret set \
#     --vault-name <vault> --name dx-metrics-scope-secret \
#     --value "$(openssl rand -base64 32)"
#   az containerapp revision restart \
#     --name <container-app> --resource-group <resource-group>
#
# then mint the links and distribute them. The placeholder is longer than the
# runtime's 32-character minimum on purpose: a link presented before the real
# value lands is rejected as invalid rather than crashing the request.
#
# Rotation invalidates every link in circulation and follows the same secret-set
# and restart pair.
#
# Do not increment `value_wo_version`: a bump makes Terraform rewrite the
# placeholder over the real secret and breaks every distributed link. Rotation
# is a Key Vault operation, not a Terraform one.
#
# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "scope_secret" {
  name         = "dx-metrics-scope-secret"
  key_vault_id = var.key_vault_id

  value_wo         = "placeholder-set-the-real-secret-in-key-vault"
  value_wo_version = 1

  tags = var.tags
}
