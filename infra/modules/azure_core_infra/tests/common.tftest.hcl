provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {}
}

run "core_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_core_infra/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create DEV environment for test"
    }

    virtual_network_cidr = "10.50.0.0/16"

    nat_enabled = true
    vpn_enabled = true
  }

  # Checks some assertions
  assert {
    condition     = var.vpn_enabled == true
    error_message = "VPN have to be enabled becouse cidr_subnet and dnsforwarder_cidr_subnet are set"
  }

  assert {
    condition     = local.nat_enabled == true
    error_message = "NAT Gateway have to be enabled becouse nat_enabled is set and test_enabled not"
  }

  assert {
    condition     = module.network.vnet.name == "dx-d-itn-common-vnet-${run.setup_tests.environment.instance_number}"
    error_message = "VNet name is not correct"
  }

  assert {
    condition     = module.network.pep_snet.name == "dx-d-itn-pep-snet-${run.setup_tests.environment.instance_number}"
    error_message = "Pep subnet name is not correct"
  }

  assert {
    condition     = module.nat_gateway[0].nat_gateways[0].name == "dx-d-itn-ng-${run.setup_tests.environment.instance_number}"
    error_message = "The NAT Gateway name configuration must be correct"
  }

  assert {
    condition     = module.dns.private_dns_zones.vault.name == "privatelink.vaultcore.azure.net"
    error_message = "The Private DNS Zones configuration must be correct"
  }

  assert {
    condition     = try(azurerm_resource_group.test[0], "NotTestEnv") == "NotTestEnv"
    error_message = "This Environment is not a Test Environment"
  }

  assert {
    condition = (
      module.dx_app_cd_resource_group_deploy.custom_role_name == "DX App CD Resource Groups" &&
      startswith(
        module.dx_app_cd_resource_group_deploy.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The App CD merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_app_ci_resource_group_reader.custom_role_name == "DX App CI Resource Groups" &&
      startswith(
        module.dx_app_ci_resource_group_reader.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The App CI merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_infra_cd_private_networking.custom_role_name == "DX Infra CD Private Networking" &&
      startswith(
        module.dx_infra_cd_private_networking.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Infra CD private networking merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_infra_cd_resource_group_deploy.custom_role_name == "DX Infra CD Resource Groups" &&
      startswith(
        module.dx_infra_cd_resource_group_deploy.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Infra CD merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_infra_cd_subscription_admin.custom_role_name == "DX Infra CD Subscription" &&
      startswith(
        module.dx_infra_cd_subscription_admin.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Infra CD subscription merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_infra_ci_resource_group_reader.custom_role_name == "DX Infra CI Resource Groups" &&
      startswith(
        module.dx_infra_ci_resource_group_reader.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Infra CI merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_infra_ci_subscription_reader.custom_role_name == "DX Infra CI Subscription" &&
      startswith(
        module.dx_infra_ci_subscription_reader.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Infra CI subscription merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_function_host_storage.custom_role_name == "DX Function Host Storage" &&
      startswith(
        module.dx_function_host_storage.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Function App host storage merged custom role must have the expected name and be created at subscription scope"
  }

  assert {
    condition = (
      module.dx_function_durable_storage.custom_role_name == "DX Function Durable Storage" &&
      startswith(
        module.dx_function_durable_storage.custom_role_id,
        "${data.azurerm_subscription.current.id}/providers/Microsoft.Authorization/roleDefinitions/"
      )
    )
    error_message = "The Function App durable storage merged custom role must have the expected name and be created at subscription scope"
  }
}
