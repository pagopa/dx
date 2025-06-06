resource "azurerm_cdn_frontdoor_secret" "certificate" {
  for_each = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain if lookup(local.is_apex, custom_domain.host_name, false) }

  name                     = "${replace(each.key, ".", "-")}-customer-certificate"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  secret {
    customer_certificate {
      key_vault_certificate_id = each.value.dns.key_vault_certificate_versionless_id
    }
  }
}

resource "azurerm_cdn_frontdoor_custom_domain" "this" {
  for_each = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain }

  name                     = replace(each.key, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  host_name                = each.value.host_name

  # Not an apex domain, so we can use a managed certificate
  dynamic "tls" {
    for_each = lookup(local.is_apex, each.value.host_name, false) ? [] : [1]
    content {
      certificate_type    = "ManagedCertificate"
      minimum_tls_version = "TLS12"
    }
  }

  # Apex domain, so we need to use a customer certificate
  dynamic "tls" {
    for_each = lookup(local.is_apex, each.value.host_name, false) ? [1] : []
    content {
      certificate_type        = "CustomerCertificate"
      cdn_frontdoor_secret_id = azurerm_cdn_frontdoor_secret.certificate[each.key].id
      minimum_tls_version     = "TLS12"
    }
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "this" {
  for_each = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain }

  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.this[each.key].id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.this.id]
}

# Data source for key vaults - using composite key to ensure uniqueness
data "azurerm_key_vault" "this" {
  for_each = { for custom_domain in var.custom_domains :
    "${custom_domain.custom_certificate.key_vault_name}:${custom_domain.custom_certificate.key_vault_resource_group_name}" => custom_domain
  if lookup(local.is_apex, custom_domain.host_name, false) }

  name                = each.value.custom_certificate.key_vault_name
  resource_group_name = each.value.custom_certificate.key_vault_resource_group_name
}

# Create role assignments for the Front Door's managed identity to access
# the Key Vault that support RBAC - only once per key vault
resource "azurerm_role_assignment" "this" {
  for_each = { for k, v in local.unique_key_vaults_rbac : k => v[0] }

  description          = "Role assignment for Front Door's managed identity to access the customer certificate in Key Vault"
  scope                = data.azurerm_key_vault.this[each.key].id
  role_definition_name = "Key Vault Secret User"
  principal_id         = azurerm_cdn_frontdoor_profile.this.identity[0].principal_id
}

# Create access policies for the Front Door's managed identity to access
# the Key Vault that do not support RBAC - only once per key vault
resource "azurerm_key_vault_access_policy" "this" {
  for_each = { for k, v in local.unique_key_vaults_no_rbac : k => v[0] }

  key_vault_id = data.azurerm_key_vault.this[each.key].id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_cdn_frontdoor_profile.this.identity[0].principal_id

  secret_permissions = ["List", "Get"]
}
