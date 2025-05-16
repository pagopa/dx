resource "azurerm_monitor_autoscale_setting" "this" {
  count = local.sku_name == "Premium" ? 1 : 0

  name                = local.autoscaler_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  target_resource_id  = azurerm_servicebus_namespace.this.id

  profile {
    name = "Default"
    capacity {
      minimum = 1
      maximum = 2
      default = 1
    }

    rule {
      scale_action {
        direction = "Increase"
        type      = "ServiceAllowedNextValue"
        value     = 1
        cooldown  = "PT5M"
      }
      metric_trigger {
        metric_name              = "NamespaceCpuUsage"
        metric_namespace         = "microsoft.servicebus/namespaces"
        metric_resource_id       = azurerm_servicebus_namespace.this.id
        operator                 = "GreaterThanOrEqual"
        statistic                = "Average"
        threshold                = 70
        time_aggregation         = "Average"
        time_grain               = "PT1M"
        time_window              = "PT5M"
        divide_by_instance_count = false
      }
    }

    rule {
      scale_action {
        direction = "Decrease"
        type      = "ServiceAllowedNextValue"
        value     = 1
        cooldown  = "PT5M"
      }
      metric_trigger {
        metric_name              = "NamespaceCpuUsage"
        metric_namespace         = "microsoft.servicebus/namespaces"
        metric_resource_id       = azurerm_servicebus_namespace.this.id
        operator                 = "LessThanOrEqual"
        statistic                = "Average"
        threshold                = 20
        time_aggregation         = "Average"
        time_grain               = "PT1M"
        time_window              = "PT10M"
        divide_by_instance_count = false
      }
    }

    rule {
      scale_action {
        direction = "Increase"
        type      = "ServiceAllowedNextValue"
        value     = 1
        cooldown  = "PT5M"
      }
      metric_trigger {
        metric_name              = "NamespaceMemoryUsage"
        metric_namespace         = "microsoft.servicebus/namespaces"
        metric_resource_id       = azurerm_servicebus_namespace.this.id
        operator                 = "GreaterThanOrEqual"
        statistic                = "Average"
        threshold                = 60
        time_aggregation         = "Average"
        time_grain               = "PT1M"
        time_window              = "PT5M"
        divide_by_instance_count = false
      }
    }

    rule {
      scale_action {
        direction = "Decrease"
        type      = "ServiceAllowedNextValue"
        value     = 1
        cooldown  = "PT5M"
      }
      metric_trigger {
        metric_name              = "NamespaceMemoryUsage"
        metric_namespace         = "microsoft.servicebus/namespaces"
        metric_resource_id       = azurerm_servicebus_namespace.this.id
        operator                 = "LessThanOrEqual"
        statistic                = "Average"
        threshold                = 20
        time_aggregation         = "Average"
        time_grain               = "PT1M"
        time_window              = "PT10M"
        divide_by_instance_count = false
      }
    }
  }

  tags = var.tags
}
