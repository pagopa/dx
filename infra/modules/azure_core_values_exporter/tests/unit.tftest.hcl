variables {
  core_state = {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstate"
    container_name       = "terraform-state"
    key                  = "core.tfstate"
  }
}

mock_provider "azurerm" {
  mock_data "azurerm_subscription" {
    defaults = {
      id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
      subscription_id = "00000000-0000-0000-0000-000000000000"
      tenant_id       = "11111111-1111-1111-1111-111111111111"
    }
  }
}
mock_provider "dx" {}

override_data {
  target = data.terraform_remote_state.core_azurerm[0]
  values = {
    outputs = {
      values = {
        "00000000-0000-0000-0000-000000000000" = {
          common_resource_group_name     = "rg-common"
          common_resource_group_id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common"
          network_resource_group_name    = "rg-network"
          network_resource_group_id      = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network"
          test_resource_group_name       = "rg-test"
          test_resource_group_id         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test"
          opex_resource_group_name       = "rg-opex"
          opex_resource_group_id         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-opex"
          github_runner                  = { environment_id = "runner-env", resource_group_name = "rg-runner", subnet_id = "runner-subnet" }
          common_vnet                    = { name = "vnet-common", id = "vnet-common-id" }
          common_pep_snet                = { name = "snet-pep", id = "snet-pep-id" }
          common_test_snet               = { name = "snet-test", id = "snet-test-id" }
          common_vpn_snet                = { name = "GatewaySubnet", id = "snet-vpn-id" }
          common_nat_gateways            = []
          vpn_gateway_id                 = "vpn-gateway-id"
          vpn_fqdns                      = ["vpn.example.test"]
          vpn_public_ips                 = ["10.0.0.1"]
          common_key_vault               = { name = "kv-common", id = "kv-common-id", resource_group_name = "rg-common" }
          common_log_analytics_workspace = { id = "law-id", name = "law-common", workspace_id = "workspace-id" }
          application_insights = {
            id                                 = "appi-id", name = "dx-u-itn-common-appi-01", instrumentation_key_kv_secret_id = "secret-id",
            instrumentation_key_kv_secret_name = "appi-key", resource_group_name = "rg-common"
          }
        }
      }
    }
  }
}

run "core_values_exporter_reads_azurerm_state" {
  command = plan

  assert {
    condition     = local.backend_type == "azurerm"
    error_message = "Azure Storage state settings must select the azurerm backend."
  }

  assert {
    condition     = output.application_insights.name == "dx-u-itn-common-appi-01"
    error_message = "Exporter outputs must be derived from the mocked core state."
  }
}
