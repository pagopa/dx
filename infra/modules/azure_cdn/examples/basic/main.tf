
resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "cdn",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}


module "storage_account" {
  source = "../../../azure_storage_account"

  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  tier                = "s"
  subnet_pep_id       = data.azurerm_subnet.pep.id

  force_public_network_access_enabled = true

  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = false
  }

  tags = local.tags
}

data "azurerm_key_vault" "kv" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "key_vault"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "resource_group"
  }))
}

data "azurerm_key_vault_certificate" "cert" {
  name         = "my-secret-certificate"
  key_vault_id = data.azurerm_key_vault.kv.id
}

module "azure_cdn" {
  source = "../../"

  resource_group_name = azurerm_resource_group.example.name

  environment = local.environment

  origins = {
    primary = {
      host_name = module.storage_account.primary_web_host
    }
  }

  custom_domains = [
    {
      # A record with name foo will be created in bar.com zone
      host_name = "foo.bar.com",
      dns = {
        zone_name                = "bar.com",
        zone_resource_group_name = azurerm_resource_group.example.name
      }
    },
    {
      # No DNS record will be created for this domain
      host_name = "test.bar.com",
    },
    {
      host_name = "apex.foo.com",
      dns = {
        # This is an apex domain cause host_name equals to zone_name
        zone_name                = "apex.foo.com",
        zone_resource_group_name = azurerm_resource_group.example.name
      }
      custom_certificate = {
        key_vault_certificate_versionless_id = data.azurerm_key_vault_certificate.cert.versionless_id
        key_vault_name                       = data.azurerm_key_vault.kv.name
        key_vault_resource_group_name        = data.azurerm_key_vault.kv.resource_group_name
        key_vault_has_rbac_support           = data.azurerm_key_vault.kv.enable_rbac_authorization
      }
    }
  ]

  tags = local.tags
}

# Optionally add FrontDoor rules to manage redirects
# https://learn.microsoft.com/en-us/azure/frontdoor/front-door-rules-engine?pivots=front-door-standard-premium
resource "azurerm_cdn_frontdoor_rule" "example" {
  name                      = "examplerule"
  cdn_frontdoor_rule_set_id = module.azure_cdn.rule_set_id
  order                     = 1
  behavior_on_match         = "Continue"

  actions {
    url_redirect_action {
      redirect_type        = "PermanentRedirect"
      redirect_protocol    = "MatchRequest"
      query_string         = "clientIp={client_ip}"
      destination_path     = "/exampleredirection"
      destination_hostname = "contoso.com"
      destination_fragment = "UrlRedirect"
    }
  }

  conditions {
    host_name_condition {
      operator         = "Equal"
      negate_condition = false
      match_values     = ["www.contoso.com", "images.contoso.com", "video.contoso.com"]
      transforms       = ["Lowercase", "Trim"]
    }
  }
}

output "cdn_endpoint_url" {
  value = module.azure_cdn.endpoint_hostname
}
