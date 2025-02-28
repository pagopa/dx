
resource "azurerm_resource_group" "example" {
  name     = "${module.naming_convention.project}-cdn-rg-${local.environment.instance_number}"
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
}


module "storage_account" {
  source = "../../../azure_storage_account"

  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  tier = "s"
  subnet_pep_id = data.azurerm_subnet.pep.id
  static_website = {
    enabled = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
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
  
  delivery_rules = {
    redirect-to-https = {
      order = 1
      request_scheme_condition = "HTTP"
      actions = {
        url_redirect_action = {
          redirect_type = "Found"
          protocol      = "Https"
        }
      }
    }
  }
  
  tags = local.tags
}

output "cdn_endpoint_url" {
  value = module.azure_cdn.endpoint_hostname
}