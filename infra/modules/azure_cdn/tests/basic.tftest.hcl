provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn for test"
    }
  }
}

run "verify_basic_cdn_setup" {
  command = plan
  
  variables {
    resource_group_name = "test-cdn-rg"
    
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
    
    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }
    
    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn for test"
    }
  }

  assert {
    condition     = azurerm_cdn_frontdoor_profile.this.sku_name == "Standard_AzureFrontDoor"
    error_message = "CDN profile SKU should be Standard_Microsoft"
  }
  
  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 1
    error_message = "Expected exactly one origin to be created"
  }
  
  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].host_name == run.setup_tests.storage_account_host_name
    error_message = "Origin hostname doesn't match expected value"
  }
}