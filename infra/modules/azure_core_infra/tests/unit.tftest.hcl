mock_provider "azuread" {}
mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_client_config.current
  values = {
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "11111111-1111-1111-1111-111111111111"
  }
}

override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    display_name    = "DX Test"
  }
}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    Environment = "Uat"
  }

  vpn_enabled = false
}

run "core_infra_preserves_private_dns_zone_outputs" {
  command = plan

  assert {
    condition     = contains(output.private_dns_zones, "privatelink.vaultcore.azure.net")
    error_message = "The private DNS zone output must continue to include the Key Vault zone."
  }
}

run "linked_log_analytics_workspace" {
  command   = apply
  state_key = "log_analytics"

  module {
    source = "./tests/fixtures/linked_log_analytics"
  }

  variables {
    naming_config = {
      prefix      = "dx"
      environment = "u"
      location    = "italynorth"
    }
    resource_group_name = "rg-test"
    location            = "italynorth"
  }
}

run "core_infra_preserves_linked_log_analytics_sku" {
  command   = plan
  state_key = "log_analytics"

  module {
    source = "./modules/log_analytics"
  }

  variables {
    naming_config = {
      prefix      = "dx"
      environment = "u"
      location    = "italynorth"
    }
    resource_group_name = "rg-test"
    location            = "italynorth"
  }

  assert {
    condition     = azurerm_log_analytics_workspace.this.sku == "LACluster"
    error_message = "A linked workspace must retain its LACluster SKU in the plan."
  }
}
