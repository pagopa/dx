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
    Owner = "DevEx"
  }

  resource_group_name = "rg-test"
  publisher_email     = "example@pagopa.it"
  publisher_name      = "Example Publisher"
  subnet_id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-apim"
  subnet_pep_id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.management_azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/management.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.scm_azure_api_net
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/scm.azure-api.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.apim
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azure-api.net"
  }
}

run "azure_api_management_rejects_invalid_application_insights" {
  command = plan

  variables {
    application_insights = {
      enabled             = true
      connection_string   = null
      sampling_percentage = 101
      verbosity           = "error"
    }
  }

  expect_failures = [var.application_insights]
}

run "azure_api_management_rejects_unknown_metric_alert_thresholds" {
  command = plan

  variables {
    metric_alert_thresholds = {
      failed_request = 500
    }
  }

  expect_failures = [var.metric_alert_thresholds]
}

run "azure_api_management_rejects_non_positive_metric_alert_thresholds" {
  command = plan

  variables {
    metric_alert_thresholds = {
      failed_requests = 0
    }
  }

  expect_failures = [var.metric_alert_thresholds]
}

run "azure_api_management_rejects_threshold_overrides_for_unsupported_alerts" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    metric_alert_thresholds = {
      cpu_percent_gateway = 80
    }
  }

  expect_failures = [var.metric_alert_thresholds]
}

run "azure_api_management_rejects_threshold_overrides_with_custom_alerts" {
  command = plan

  variables {
    metric_alerts = {}
    metric_alert_thresholds = {
      failed_requests = 500
    }
  }

  expect_failures = [var.metric_alert_thresholds]
}

run "azure_api_management_rejects_unknown_disabled_metric_alerts" {
  command = plan

  variables {
    metric_alert_thresholds = {
      failed_request = null
    }
  }

  expect_failures = [var.metric_alert_thresholds]
}

run "azure_api_management_rejects_out_of_range_autoscale_default" {
  command = plan

  variables {
    autoscale = {
      minimum_instances = 2
      default_instances = 10
      maximum_instances = 5
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_zero_autoscale_minimum" {
  command = plan

  variables {
    autoscale = {
      minimum_instances = 0
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_zero_autoscale_scale_out" {
  command = plan

  variables {
    autoscale = {
      scale_out_value = "0"
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_zero_autoscale_scale_in" {
  command = plan

  variables {
    autoscale = {
      scale_in_value = "0"
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_non_zonal_autoscale_values" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      minimum_instances = 3
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_non_zonal_autoscale_maximum" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      maximum_instances = 7
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_non_zonal_autoscale_default" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      default_instances = 3
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_non_zonal_autoscale_scale_out" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      scale_out_value = "3"
    }
  }

  expect_failures = [var.autoscale]
}

run "azure_api_management_rejects_non_zonal_autoscale_scale_in" {
  command = plan

  variables {
    use_case                      = "high_load"
    public_ip_address_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-test"
    virtual_network_type_internal = true
    autoscale = {
      scale_in_value = "3"
    }
  }

  expect_failures = [var.autoscale]
}
