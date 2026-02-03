terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.1.0, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.6.5, < 1.0.0"
    }
  }
}

#----------------#
# API Management #
#----------------#

resource "azurerm_api_management" "this" {
  name                          = local.apim.name
  resource_group_name           = var.resource_group_name
  location                      = var.environment.location
  publisher_name                = var.publisher_name
  publisher_email               = var.publisher_email
  notification_sender_email     = var.notification_sender_email
  sku_name                      = local.use_case_features.sku
  zones                         = local.use_case_features.zones
  public_network_access_enabled = local.public_network
  public_ip_address_id          = local.public_network && local.virtual_network_type == "Internal" ? var.public_ip_address_id : null

  min_api_version = "2021-08-01"

  identity {
    type = "SystemAssigned"
  }

  virtual_network_type = local.virtual_network_type

  dynamic "virtual_network_configuration" {
    for_each = local.virtual_network_configuration_enabled ? ["dummy"] : []
    content {
      subnet_id = var.subnet_id
    }
  }

  dynamic "sign_up" {
    for_each = var.use_case != "cost_optimized" ? ["dummy"] : []
    content {
      enabled = false
      terms_of_service {
        enabled          = false
        consent_required = false
      }
    }
  }

  dynamic "hostname_configuration" {
    for_each = length(concat(
      var.hostname_configuration.proxy,
      var.hostname_configuration.management,
      var.hostname_configuration.portal,
      var.hostname_configuration.developer_portal,
      var.hostname_configuration.scm
    )) > 0 ? ["dummy"] : []
    content {
      dynamic "proxy" {
        for_each = var.hostname_configuration.proxy
        iterator = domain
        content {
          default_ssl_binding      = domain.value.default_ssl_binding
          host_name                = domain.value.host_name
          key_vault_certificate_id = domain.value.key_vault_id
        }
      }

      dynamic "management" {
        for_each = var.hostname_configuration.management
        iterator = domain
        content {
          host_name                = domain.value.host_name
          key_vault_certificate_id = domain.value.key_vault_id
        }
      }

      dynamic "portal" {
        for_each = var.hostname_configuration.portal
        iterator = domain
        content {
          host_name                = domain.value.host_name
          key_vault_certificate_id = domain.value.key_vault_id
        }
      }

      dynamic "developer_portal" {
        for_each = var.hostname_configuration.developer_portal
        iterator = domain
        content {
          host_name                = domain.value.host_name
          key_vault_certificate_id = domain.value.key_vault_id
        }
      }

      dynamic "scm" {
        for_each = var.hostname_configuration.scm
        iterator = domain
        content {
          host_name                = domain.value.host_name
          key_vault_certificate_id = domain.value.key_vault_id
        }
      }
    }
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      # Ignore changes to sku_name capacity when autoscaling is enabled
      sku_name,
    ]
  }

  depends_on = [azurerm_network_security_group.nsg_apim]
}

#--------#
# Policy #
#--------#
resource "azurerm_api_management_policy" "this" {
  count             = var.xml_content != null ? 1 : 0
  api_management_id = azurerm_api_management.this.id
  xml_content       = var.xml_content
}

#-------------#
# Autoscaling #
#-------------#

# NOTE: only Premium sku support autoscaling
resource "azurerm_monitor_autoscale_setting" "this" {
  count               = local.use_case_features.autoscale ? 1 : 0
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

#-------------#
# Certificate #
#-------------#

data "azurerm_key_vault_certificate" "key_vault_certificate" {
  count        = var.key_vault_id != null ? length(var.certificate_names) : 0
  name         = var.certificate_names[count.index]
  key_vault_id = var.key_vault_id
}

resource "azurerm_api_management_certificate" "this" {
  count               = var.key_vault_id != null ? length(var.certificate_names) : 0
  name                = var.certificate_names[count.index]
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name

  key_vault_secret_id = trimsuffix(data.azurerm_key_vault_certificate.key_vault_certificate[count.index].secret_id, data.azurerm_key_vault_certificate.key_vault_certificate[count.index].version)
}

#------#
# Lock #
#------#

resource "azurerm_management_lock" "this" {
  count      = var.lock_enable ? 1 : 0
  name       = "${azurerm_api_management.this.name}-lock"
  scope      = azurerm_api_management.this.id
  lock_level = "CanNotDelete"
  notes      = "This item can't be deleted in this subscription!"
}
