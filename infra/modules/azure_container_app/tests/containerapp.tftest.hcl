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

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name

    create_container_app_environment = true
  
    virtual_network = {
      name                = "dx-d-itn-common-vnet-01"
      resource_group_name = "dx-d-itn-network-rg-01"
    }
    subnet_pep_id = run.setup_tests.pep_snet_id
    subnet_cidr   = "10.50.100.0/24"
    
    container_app_template = {
      image = "nginx"
      name  = "nginx"

      envs = {
        "TEST1" = "value1",
        "TEST2" = "value2"
      }
    }
  }

  # Checks some assertions
  assert {
    condition     = azurerm_container_app.this.name == "dx-d-itn-modules-test-ca-01"
    error_message = "The container app name is not correct"
  }

  assert {
    condition     = azurerm_container_app_environment.this[0].name == "dx-d-itn-modules-test-cae-01"
    error_message = "The container app environment name is not correct"
  }

  assert {
    condition     = azurerm_container_app.this.template[0].container[0].image == "nginx"
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
}
