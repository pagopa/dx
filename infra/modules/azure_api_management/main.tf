terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
  }
}

module "naming_convention" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
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
      subnet_id = var.subnet_id
    }
  }

  sign_up {
    enabled = false
    terms_of_service {
      enabled          = false
      consent_required = false
    }
  }

  dynamic "hostname_configuration" {
    for_each = var.hostname_configuration != null ? ["dummy"] : []
    content {
      dynamic "proxy" {
        for_each = var.hostname_configuration.proxy
        iterator = domain
        content {
          default_ssl_binding = domain.value.default_ssl_binding
          host_name           = domain.value.host_name
          key_vault_id        = domain.value.key_vault_id
        }
      }
    }
  }

  tags = var.tags
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
  count               = var.tier == "l" && var.autoscale != null && var.autoscale.enabled ? 1 : 0
  name                = local.apim.autoscale_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
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
