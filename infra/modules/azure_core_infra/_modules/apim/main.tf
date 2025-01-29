resource "azurerm_api_management" "this" {
  name                          = local.apim.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  publisher_name                = var.publisher_name
  publisher_email               = var.publisher_email
  notification_sender_email     = null
  sku_name                      = local.apim.sku_name
  zones                         = var.tier == "l" ? ["1", "2", "3"] : null
  public_network_access_enabled = var.enable_public_network_access

  # Managed identity type: System
  identity {
    type = "SystemAssigned"
  }

  virtual_network_type = var.virtual_network_type_internal ? "Internal" : "None"

  # subnet
  dynamic "virtual_network_configuration" {
    for_each = var.virtual_network_type_internal ? ["dummy"] : []
    content {
      subnet_id = azurerm_subnet.snet.id
    }
  }

  sign_up {
    enabled = false
    terms_of_service {
      enabled          = false
      consent_required = false
    }
  }

  tags = var.tags
}

#-------------#
# Autoscaling #
#-------------#

# NOTE: only Premium sku support autoscaling
resource "azurerm_monitor_autoscale_setting" "this" {
  count               = var.tier == "l" && var.autoscale != null && var.autoscale.enabled ? 1 : 0
  name                = local.apim.autoscale_name
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = azurerm_api_management.this.id

  profile {
    name = "default"

    capacity {
      default = var.autoscale.default_instances
      minimum = var.autoscale.minimum_instances
      maximum = var.autoscale.maximum_instances
    }

    rule {
      metric_trigger {
        metric_name              = "Capacity"
        metric_resource_id       = azurerm_api_management.this.id
        metric_namespace         = "microsoft.apimanagement/service"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = var.autoscale.scale_out_time_window
        time_aggregation         = "Average"
        operator                 = "GreaterThan"
        threshold                = var.autoscale.scale_out_capacity_percentage
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = var.autoscale.scale_out_value
        cooldown  = var.autoscale.scale_out_cooldown
      }
    }

    rule {
      metric_trigger {
        metric_name              = "Capacity"
        metric_resource_id       = azurerm_api_management.this.id
        metric_namespace         = "microsoft.apimanagement/service"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = var.autoscale.scale_in_time_window
        time_aggregation         = "Average"
        operator                 = "LessThan"
        threshold                = var.autoscale.scale_in_capacity_percentage
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = var.autoscale.scale_in_value
        cooldown  = var.autoscale.scale_in_cooldown
      }
    }
  }
}