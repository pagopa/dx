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

module "rbac" {
  for_each = { for custom_domain in var.custom_domains : custom_domain.host_name => custom_domain if lookup(local.is_apex, custom_domain.host_name, false) }

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = data.azuread_service_principal.frontdoor.object_id
  subscription_id = data.azurerm_client_config.current.subscription_id

  key_vault = [{
    name                = each.value.custom_certificate.key_vault_name
    resource_group_name = each.value.custom_certificate.key_vault_resource_group_name
    has_rbac_support    = each.value.custom_certificate.key_vault_has_rbac_support
    description         = "Allow FrontDoor ${azurerm_cdn_frontdoor_endpoint.this.name} to access the certificate in the key vault"

    roles = {
      secrets      = "read"
      certificates = "read"
    }
  }]
}
