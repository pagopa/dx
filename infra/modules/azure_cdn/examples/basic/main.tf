
resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "cdn",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "azurerm_storage_account" "origin" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    resource_type = "storage_account"
  }))
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  public_network_access    = "Enabled"
  tags                     = local.tags
}

resource "azurerm_storage_account_static_website" "origin" {
  storage_account_id = azurerm_storage_account.origin.id
  index_document     = "index.html"
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
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 3.0"

  resource_group_name = azurerm_resource_group.example.name

  environment = local.environment

  # Basic origin configuration
  origins = {
    primary = {
      host_name = azurerm_storage_account.origin.primary_web_host
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
        key_vault_has_rbac_support           = data.azurerm_key_vault.kv.rbac_authorization_enabled
      }
    }
  ]

  tags = local.tags

  depends_on = [azurerm_storage_account_static_website.origin]
}

# Optionally add FrontDoor rules to manage redirects
# https://learn.microsoft.com/en-us/azure/frontdoor/front-door-rules-engine?pivots=front-door-standard-premium
resource "azurerm_cdn_frontdoor_rule" "example" {
  name                      = "examplerule"
  cdn_frontdoor_rule_set_id = module.azure_cdn.rule_set_id
  order                     = 1
  behaviour_on_match        = "Continue"

  actions {
    url_redirect {
      redirect_type         = "PermanentRedirect"
      redirect_protocol     = "MatchRequest"
      query_string          = "clientIp={client_ip}"
      destination_path      = "/exampleredirection"
      destination_host_name = "contoso.com"
      destination_fragment  = "UrlRedirect"
    }
  }

  conditions {
    host_name {
      operator   = "Equal"
      values     = ["www.contoso.com", "images.contoso.com", "video.contoso.com"]
      transforms = ["Lowercase", "Trim"]
    }
  }
}

output "cdn_endpoint_url" {
  value = module.azure_cdn.endpoint_hostname
}
