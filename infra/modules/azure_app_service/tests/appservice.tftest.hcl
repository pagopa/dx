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
  }
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
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create app service for test"
  }

  resource_group_name = run.setup_tests.resource_group_name

  virtual_network = {
    name                = run.setup_tests.vnet.name
    resource_group_name = run.setup_tests.vnet.resource_group_name
  }

  subnet_pep_id                        = run.setup_tests.pep_id
  subnet_cidr                          = "10.20.50.0/24"
  private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"
}

run "app_service_is_correct_plan" {
  command = plan

  variables {
    use_case = "default"
  }

  # Checks some assertions
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The App Service Plan is incorrect, have to be P1v3"
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only == true
    error_message = "The App Service should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "20-lts"
    error_message = "The App Service must use Node version 20 LTS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].always_on == true
    error_message = "The App Service should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service must use TLS version 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service staging slot must use TLS version 1.2"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "Subnet should be created"
  }
}

run "app_service_custom_subnet" {
  command = plan

  variables {
    use_case    = "default"
    subnet_cidr = null
    subnet_id   = run.setup_tests.pep_id
  }

  assert {
    condition     = azurerm_subnet.this == []
    error_message = "Subnet should not be created"
  }
}

run "app_service_override_size" {
  command = plan

  variables {
    use_case = "default"
    size     = "P2v3"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P2v3"
    error_message = "The App Service Plan is incorrect, have to be P2v3"
  }
}

run "app_service_override_size_fail" {
  command = plan

  variables {
    use_case = "default"
    size     = "B1"
  }

  expect_failures = [
    var.size,
  ]
}
