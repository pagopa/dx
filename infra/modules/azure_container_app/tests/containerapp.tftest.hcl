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

run "container_app_is_correct_plan" {
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

    tier = "xs"

    resource_group_name = run.setup_tests.resource_group_name

    container_app_environment = {
      id = run.setup_tests.container_app_environment_id
      private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone.resource_group_name
    }

    log_analytics_workspace_id       = run.setup_tests.log_analytics_id

    container_app_templates = [
      {
        image = "nginx:latest"
        name  = "nginx"

        app_settings = {
          "TEST1" = "value1",
          "TEST2" = "value2"
        }
      }
    ]
  }

  # Checks some assertions
  assert {
    condition     = azurerm_container_app.this.name == "dx-d-itn-modules-test-ca-01"
    error_message = "The container app name is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].image == "nginx:latest"
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = length(azurerm_container_app.this.template[0].container[0].env) == 2
    error_message = "The container app image is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].max_replicas == 1 && azurerm_container_app.this.template[0].min_replicas == 0
    error_message = "The container app replica values are not correct"
  }

  assert {
    condition     = azurerm_private_dns_a_record.this.resource_group_name == var.container_app_environment.private_dns_zone_resource_group_name
    error_message = "The private DNS resource group name is not correct"
  }
}
