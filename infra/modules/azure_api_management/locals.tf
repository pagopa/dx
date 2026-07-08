locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  apim_name = local.naming_config.name != "apim" ? local.naming_config.name : ""

  apim = {
    name           = provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management" }))
    pep_name       = local.use_case_features.private_endpoint ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "apim_private_endpoint" })) : null
    public_ip_name = local.use_case_features.public_ip ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "public_ip" })) : null
    autoscale_name = local.use_case_features.autoscale ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management_autoscale" })) : null

    log_category_groups = ["allLogs"]
  }

  use_cases = {
    development = {
      sku                                        = "Developer_1"
      virtual_network_type                       = "Internal"
      autoscale                                  = false
      alerts                                     = false
      private_endpoint                           = false
      zones                                      = null
      public_network_access_enabled              = true
      public_ip                                  = false
      public_ip_zones                            = null
      monitoring                                 = false
      lock                                       = false
      developer_portal_username_password_enabled = true
    }
    cost_optimized = {
      sku                                        = "StandardV2_1"
      virtual_network_type                       = "External"
      autoscale                                  = false
      alerts                                     = true
      private_endpoint                           = true
      zones                                      = null
      public_network_access_enabled              = false
      public_ip                                  = false
      public_ip_zones                            = null
      monitoring                                 = true
      lock                                       = true
      developer_portal_username_password_enabled = false
    }
    high_load = {
      sku                                        = "Premium_2"
      virtual_network_type                       = "Internal"
      autoscale                                  = true
      alerts                                     = true
      private_endpoint                           = false
      zones                                      = ["1", "2"]
      public_network_access_enabled              = true
      public_ip                                  = true
      public_ip_zones                            = ["1", "2"]
      monitoring                                 = true
      lock                                       = true
      developer_portal_username_password_enabled = false
    }
  }

  use_case_features = local.use_cases[var.use_case]

  virtual_network_type                  = local.use_case_features.virtual_network_type
  virtual_network_configuration_enabled = contains(["External", "Internal"], local.virtual_network_type)
  public_network                        = local.use_case_features.public_network_access_enabled
  private_dns_zone_resource_group_name  = coalesce(var.private_dns_zone_resource_group_name, data.azurerm_virtual_network.this.resource_group_name)

  private_dns_zone_ids = {
    azure_api_net             = data.azurerm_private_dns_zone.azure_api_net.id
    management_azure_api_net  = data.azurerm_private_dns_zone.management_azure_api_net.id
    scm_azure_api_net         = data.azurerm_private_dns_zone.scm_azure_api_net.id
    privatelink_azure_api_net = local.use_case_features.private_endpoint ? data.azurerm_private_dns_zone.apim[0].id : null
  }

  vnet_instance_number = try(
    tonumber(split("-", var.virtual_network.name)[length(split("-", var.virtual_network.name)) - 1]),
    tonumber(var.environment.instance_number)
  )

  apim_subnet_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = local.apim_name,
    resource_type = "apim_subnet",
  }))

  pep_subnet_name = provider::dx::resource_name(merge(local.naming_config, {
    domain          = "",
    name            = "pep",
    resource_type   = "subnet",
    instance_number = local.vnet_instance_number,
  }))

  subnet_id = azurerm_subnet.apim.id

  subnet_pep_id = local.use_case_features.private_endpoint ? provider::azurerm::normalise_resource_id("${data.azurerm_virtual_network.this.id}/subnets/${local.pep_subnet_name}") : null

  application_insights_enabled = try(var.application_insights.id, null) != null

  hostname_configuration = {
    proxy = [
      {
        default_ssl_binding      = try(var.hostname_configuration.proxy.use_resource_name_as_default, false)
        host_name                = "${local.apim.name}.azure-api.net"
        key_vault_certificate_id = null
      }
    ]
    management = [for domain in var.hostname_configuration.management : merge(domain, {
      key_vault_certificate_id = length(split("/", domain.key_vault_certificate_id)) > 5 ? trimsuffix(domain.key_vault_certificate_id, "/${element(split("/", domain.key_vault_certificate_id), length(split("/", domain.key_vault_certificate_id)) - 1)}") : domain.key_vault_certificate_id
    })]
    portal = [for domain in var.hostname_configuration.portal : merge(domain, {
      key_vault_certificate_id = length(split("/", domain.key_vault_certificate_id)) > 5 ? trimsuffix(domain.key_vault_certificate_id, "/${element(split("/", domain.key_vault_certificate_id), length(split("/", domain.key_vault_certificate_id)) - 1)}") : domain.key_vault_certificate_id
    })]
    developer_portal = [for domain in var.hostname_configuration.developer_portal : merge(domain, {
      key_vault_certificate_id = length(split("/", domain.key_vault_certificate_id)) > 5 ? trimsuffix(domain.key_vault_certificate_id, "/${element(split("/", domain.key_vault_certificate_id), length(split("/", domain.key_vault_certificate_id)) - 1)}") : domain.key_vault_certificate_id
    })]
    scm = [for domain in var.hostname_configuration.scm : merge(domain, {
      key_vault_certificate_id = length(split("/", domain.key_vault_certificate_id)) > 5 ? trimsuffix(domain.key_vault_certificate_id, "/${element(split("/", domain.key_vault_certificate_id), length(split("/", domain.key_vault_certificate_id)) - 1)}") : domain.key_vault_certificate_id
    })]
  }

  zone_multiplier = local.use_case_features.zones != null ? length(local.use_case_features.zones) : 1

  autoscale_config = {
    minimum_instances             = coalesce(try(var.autoscale.minimum_instances, null), local.zone_multiplier)
    default_instances             = coalesce(try(var.autoscale.default_instances, null), local.zone_multiplier)
    maximum_instances             = coalesce(try(var.autoscale.maximum_instances, null), 5 * local.zone_multiplier)
    scale_out_capacity_percentage = coalesce(try(var.autoscale.scale_out_capacity_percentage, null), 60)
    scale_out_time_window         = coalesce(try(var.autoscale.scale_out_time_window, null), "PT10M")
    scale_out_value               = coalesce(try(var.autoscale.scale_out_value, null), tostring(local.zone_multiplier))
    scale_out_cooldown            = coalesce(try(var.autoscale.scale_out_cooldown, null), "PT45M")
    scale_in_capacity_percentage  = coalesce(try(var.autoscale.scale_in_capacity_percentage, null), 30)
    scale_in_time_window          = coalesce(try(var.autoscale.scale_in_time_window, null), "PT30M")
    scale_in_value                = coalesce(try(var.autoscale.scale_in_value, null), tostring(local.zone_multiplier))
    scale_in_cooldown             = coalesce(try(var.autoscale.scale_in_cooldown, null), "PT30M")
  }
}
