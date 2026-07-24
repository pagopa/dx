terraform {
  required_version = ">= 1.14.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.1"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}

resource "azurerm_api_management" "this" {
  name                = local.apim.name
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  publisher_name            = var.publisher_name
  publisher_email           = var.publisher_email
  notification_sender_email = var.publisher_email

  sku_name                      = local.use_case_features.sku
  zones                         = local.use_case_features.zones
  public_network_access_enabled = local.use_case_features.public_network_access_enabled
  public_ip_address_id          = local.use_case_features.public_ip ? azurerm_public_ip.apim[0].id : null

  min_api_version = "2021-08-01"

  identity {
    type = "SystemAssigned"
  }

  virtual_network_type = local.virtual_network_type

  virtual_network_configuration {
    subnet_id = azurerm_subnet.apim.id
  }

  dynamic "sign_up" {
    for_each = var.use_case != "cost_optimized" ? [1] : []
    content {
      enabled = local.use_case_features.developer_portal_username_password_enabled

      terms_of_service {
        enabled          = false
        consent_required = false
      }
    }
  }

  hostname_configuration {
    dynamic "proxy" {
      for_each = local.hostname_configuration.proxy
      iterator = domain
      content {
        default_ssl_binding      = domain.value.default_ssl_binding
        host_name                = domain.value.host_name
        key_vault_certificate_id = domain.value.key_vault_certificate_id
      }
    }

    dynamic "management" {
      for_each = local.hostname_configuration.management
      iterator = domain
      content {
        host_name                = domain.value.host_name
        key_vault_certificate_id = domain.value.key_vault_certificate_id
      }
    }

    dynamic "portal" {
      for_each = local.hostname_configuration.portal
      iterator = domain
      content {
        host_name                = domain.value.host_name
        key_vault_certificate_id = domain.value.key_vault_certificate_id
      }
    }

    dynamic "developer_portal" {
      for_each = local.hostname_configuration.developer_portal
      iterator = domain
      content {
        host_name                = domain.value.host_name
        key_vault_certificate_id = domain.value.key_vault_certificate_id
      }
    }

    dynamic "scm" {
      for_each = local.hostname_configuration.scm
      iterator = domain
      content {
        host_name                = domain.value.host_name
        key_vault_certificate_id = domain.value.key_vault_certificate_id
      }
    }
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      sku_name,
    ]
  }

  depends_on = [azurerm_network_security_group.nsg_apim]
}

resource "azurerm_api_management_policy" "this" {
  count = var.xml_content != null ? 1 : 0

  api_management_id = azurerm_api_management.this.id
  xml_content       = var.xml_content
}

resource "azurerm_monitor_autoscale_setting" "this" {
  count = local.use_case_features.autoscale ? 1 : 0

  name                = local.apim.autoscale_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  target_resource_id  = azurerm_api_management.this.id

  profile {
    name = "default"

    capacity {
      default = local.autoscale_config.default_instances
      minimum = local.autoscale_config.minimum_instances
      maximum = local.autoscale_config.maximum_instances
    }

    rule {
      metric_trigger {
        metric_name              = "Capacity"
        metric_resource_id       = azurerm_api_management.this.id
        metric_namespace         = "microsoft.apimanagement/service"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = local.autoscale_config.scale_out_time_window
        time_aggregation         = "Average"
        operator                 = "GreaterThan"
        threshold                = local.autoscale_config.scale_out_capacity_percentage
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = local.autoscale_config.scale_out_value
        cooldown  = local.autoscale_config.scale_out_cooldown
      }
    }

    rule {
      metric_trigger {
        metric_name              = "Capacity"
        metric_resource_id       = azurerm_api_management.this.id
        metric_namespace         = "microsoft.apimanagement/service"
        time_grain               = "PT1M"
        statistic                = "Average"
        time_window              = local.autoscale_config.scale_in_time_window
        time_aggregation         = "Average"
        operator                 = "LessThan"
        threshold                = local.autoscale_config.scale_in_capacity_percentage
        divide_by_instance_count = false
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = local.autoscale_config.scale_in_value
        cooldown  = local.autoscale_config.scale_in_cooldown
      }
    }
  }
}

resource "azurerm_management_lock" "this" {
  count      = local.use_case_features.lock ? 1 : 0
  name       = azurerm_api_management.this.name
  scope      = azurerm_api_management.this.id
  lock_level = "CanNotDelete"
  notes      = "This item can't be deleted"
}
