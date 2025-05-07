
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
      host_name = "bar.com",
      dns = {
        # A record with name @ will be created at the apex of bar.com zone
        zone_name                = "bar.com",
        zone_resource_group_name = azurerm_resource_group.example.name
      }
    },
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
    }
  ]

  tags = local.tags
}

output "cdn_endpoint_url" {
  value = module.azure_cdn.endpoint_hostname
}
