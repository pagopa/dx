provider "azurerm" {
  features {}
}

run "setup_app_service" {
  module {
    source = "./tests/setup_app_service"
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_autoscaler/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create autoscaler for test"
    }
  }
}

run "setup_function_app" {
  module {
    source = "./tests/setup_function_app"
  }

  variables {
    app_service_plan_id = run.setup_app_service.app_service_plan_id
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_autoscaler/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create autoscaler for test"
    }
  }
}

run "autoscaler_with_existing_app_service" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_autoscaler/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create autoscaler for test"
    }

    location = "italynorth"
    resource_group_name = run.setup_app_service.resource_group_name
    app_service_plan_id = run.setup_app_service.app_service_plan_id

    target_service = {
      app_services = [
        {
          id     = run.setup_app_service.app_service.id
        }
      ]
    }

    scale_metrics = {
      cpu = {
        upper_threshold = 80
        lower_threshold = 20
        increase_by     = 1
        decrease_by     = 1
      }
    }
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.target_resource_id == var.app_service_plan_id
    error_message = "The autoscaler target resource ID does not match the provided app service plan."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].maximum == 30
    error_message = "The autoscaler maximum instance count is incorrect."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].default == 12
    error_message = "The autoscaler default instance count is incorrect."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].minimum == 4
    error_message = "The autoscaler minimum instance count is incorrect."
  }

  assert {
    condition     = length(azurerm_monitor_autoscale_setting.this.profile) > 0
    error_message = "No autoscale profiles have been created."
  }
}

run "autoscaler_with_shared_plan" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_autoscaler/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create shared plan autoscaler"
    }

    location = "italynorth"
    resource_group_name = run.setup_app_service.resource_group_name
    app_service_plan_id = run.setup_app_service.app_service_plan_id

    target_service = {
      app_services = [
        {
          id = run.setup_app_service.app_service.id
        }
      ],
      function_apps = [
        {
          id = run.setup_function_app.function_app.id
        }
      ]
    }

    scale_metrics = {
      cpu = {
        upper_threshold = 80
        lower_threshold = 20
        increase_by     = 1
        decrease_by     = 1
      },
      requests = {
        upper_threshold = 2000
        lower_threshold = 500
        increase_by     = 2
        decrease_by     = 1
      }
    }
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.target_resource_id == var.app_service_plan_id
    error_message = "The autoscaler target resource ID does not match the provided app service plan."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].maximum == 30
    error_message = "The autoscaler maximum instance count is incorrect."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].default == 12
    error_message = "The autoscaler default instance count is incorrect."
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this.profile[0].capacity[0].minimum == 4
    error_message = "The autoscaler minimum instance count is incorrect."
  }

  assert {
    condition     = length([for r in azurerm_monitor_autoscale_setting.this.profile[0].rule : r if r.metric_trigger[0].metric_name == "Requests"]) >= 4
    error_message = "The autoscaler doesn't have the expected number of request rules for shared services."
  }

  assert {
    condition     = contains([for r in azurerm_monitor_autoscale_setting.this.profile[0].rule : r.metric_trigger[0].metric_resource_id], run.setup_app_service.app_service.id)
    error_message = "The autoscaler doesn't have rules for the app service."
  }

  assert {
    condition     = contains([for r in azurerm_monitor_autoscale_setting.this.profile[0].rule : r.metric_trigger[0].metric_resource_id], run.setup_app_service.function_app.id)
    error_message = "The autoscaler doesn't have rules for the function app."
  }
}
