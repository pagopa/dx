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
