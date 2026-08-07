variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags                = { Owner = "DevEx" }
  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
  subnet_pep_id     = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/pep"
  subnet_cidr       = "10.50.80.0/24"
  health_check_path = "/health"
  app_settings      = {}
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_blob
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_file
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_queue
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.queue.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_table
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.table.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.function_app
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
  }
}

run "azure_function_app_rejects_unsupported_sku" {
  command = plan

  variables {
    size = "B1"
  }

  expect_failures = [var.size]
}

run "azure_function_app_requires_diagnostic_destination" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  expect_failures = [var.diagnostic_settings]
}

run "azure_function_app_rejects_invalid_entra_client_id" {
  command = plan

  variables {
    entra_id_authentication = {
      audience_client_id         = ""
      allowed_callers_client_ids = ["00000000-0000-0000-0000-000000000002"]
      tenant_id                  = "00000000-0000-0000-0000-000000000003"
    }
  }

  expect_failures = [var.entra_id_authentication]
}

run "azure_function_app_requires_entra_callers" {
  command = plan

  variables {
    entra_id_authentication = {
      audience_client_id         = "00000000-0000-0000-0000-000000000001"
      allowed_callers_client_ids = []
      tenant_id                  = "00000000-0000-0000-0000-000000000003"
    }
  }

  expect_failures = [var.entra_id_authentication]
}

run "azure_function_app_rejects_invalid_entra_tenant_id" {
  command = plan

  variables {
    entra_id_authentication = {
      audience_client_id         = "00000000-0000-0000-0000-000000000001"
      allowed_callers_client_ids = ["00000000-0000-0000-0000-000000000002"]
      tenant_id                  = "not-a-valid-uuid"
    }
  }

  expect_failures = [var.entra_id_authentication]
}

run "azure_function_app_rejects_unsupported_node_version" {
  command = plan

  variables {
    node_version = 99
  }

  expect_failures = [var.node_version]
}
