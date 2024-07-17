terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.108.0"
    }
  }
}

provider "azurerm" {
  features {
  }
}

module "functions" {
  source = "../azure_app_service"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "test"
    app_name        = "module"
    instance_number = "01"
  }

  resource_group_name = "dx-d"
  health_check_path   = "/"
  tier                = "test"

  app_settings  = {}
  subnet_cidr   = "10.20.7.0/26"
  subnet_pep_id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-common-rg-01/providers/Microsoft.Network/virtualNetworks/io-p-itn-common-vnet-01/subnets/io-p-itn-svc-srch-snet-01"
  virtual_network = {
    name                = "io-p-itn-common-vnet-01"
    resource_group_name = "io-p-itn-common-rg-01"
  }
  private_dns_zone_resource_group_name = "io-p-rg-common"

  subnet_service_endpoints = {
    web     = true
    cosmos  = true
    storage = false
  }

  tags = null
}
