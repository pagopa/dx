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

run "container_app_env_is_correct_plan" {
  command = plan

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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_container_app/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create Container App for test"
    }

    resource_group_name = run.setup_tests.resource_group_name

    log_analytics_workspace_id       = run.setup_tests.log_analytics_id
  
    virtual_network = {
      name                = "dx-d-itn-common-vnet-01"
      resource_group_name = "dx-d-itn-network-rg-01"
    }
    subnet_pep_id = run.setup_tests.pep_snet_id
    subnet_cidr   = "10.50.100.0/24"

    zone_redundant = true
  }

  # Checks some assertions
  assert {
    condition     = azurerm_container_app_environment.this.name == "dx-d-itn-modules-test-cae-01"
    error_message = "The container app environment name is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this.location == "italynorth"
    error_message = "The container app environment location is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this.resource_group_name == run.setup_tests.resource_group_name
    error_message = "The container app environment resource group is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this.log_analytics_workspace_id == run.setup_tests.log_analytics_id
    error_message = "The container app environment log analytics workspace id is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this.internal_load_balancer_enabled == true
    error_message = "The container app environment internal load balancer enabled is not correct"
  }

  assert {
    condition     = length([for wp in azurerm_container_app_environment.this.workload_profile : wp.name if wp.name == "Consumption"]) > 0
    error_message = "The container app environment workload profile name is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this.zone_redundancy_enabled == true
    error_message = "The container app environment zone redundancy enabled is not correct"
  }
}
