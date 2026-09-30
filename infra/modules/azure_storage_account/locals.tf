locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/module.json")).name, basename(path.module)) })

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  use_cases = {
    development = {
      alerts                            = false
      advanced_threat_protection        = false
      immutability_policy               = false
      shared_access_key_enabled         = true
      account_tier                      = "Standard"
      replication_type                  = "LRS"
      secondary_replication             = false
      infrastructure_encryption_enabled = false
      default_to_oauth_authentication   = false
    }
    default = {
      alerts                            = true
      advanced_threat_protection        = false
      immutability_policy               = false
      shared_access_key_enabled         = true
      account_tier                      = "Standard"
      replication_type                  = "ZRS"
      secondary_replication             = false
      infrastructure_encryption_enabled = false
      default_to_oauth_authentication   = false
    }
    audit = {
      alerts                            = true
      advanced_threat_protection        = false
      immutability_policy               = true
      shared_access_key_enabled         = true
      account_tier                      = "Standard"
      replication_type                  = "ZRS"
      secondary_replication             = true
      infrastructure_encryption_enabled = true
      default_to_oauth_authentication   = true
    }
    delegated_access = {
      alerts                            = true
      advanced_threat_protection        = true
      immutability_policy               = false
      shared_access_key_enabled         = false
      account_tier                      = "Standard"
      replication_type                  = "ZRS"
      secondary_replication             = false
      infrastructure_encryption_enabled = false
      default_to_oauth_authentication   = false
    }
    archive = {
      alerts                            = false
      advanced_threat_protection        = false
      immutability_policy               = true
      shared_access_key_enabled         = true
      account_tier                      = "Standard"
      replication_type                  = "LRS"
      secondary_replication             = true
      infrastructure_encryption_enabled = false
      default_to_oauth_authentication   = false
    }
  }

  # @deprecated: Remove override_infrastructure_encryption logic in next major version
  tier_features = merge(
    local.use_cases[var.use_case],
    var.override_infrastructure_encryption ? { infrastructure_encryption_enabled = false } : {}
  )

  force_public_network_access_enabled = var.force_public_network_access_enabled || var.use_case == "delegated_access"
  immutability_policy_enabled         = local.tier_features.immutability_policy || var.blob_features.immutability_policy.enabled
  immutability_policy_state           = var.blob_features.immutability_policy.state != null ? var.blob_features.immutability_policy.state : "Unlocked"

  # A private endpoint requires the resource group containing the matching Private
  # DNS zone. This remains independent of public access, so a storage account can
  # be reachable through both Front Door/CDN and a private VNet. Do not depend on
  # subnet_pep_id here: callers may pass a subnet ID computed in the same plan,
  # while for_each keys must be known before apply.
  create_private_endpoints = var.private_dns_zone_resource_group_name != null && var.private_dns_zone_resource_group_name != ""

  peps = {
    create_subservices = local.create_private_endpoints ? var.subservices_enabled : {
      blob  = false
      file  = false
      queue = false
      table = false
    }

    blob = {
      name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "blob_private_endpoint" }))
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "file_private_endpoint" }))
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "queue_private_endpoint" }))
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "table_private_endpoint" }))
      dns_zone = "privatelink.table.core.windows.net"
    }
  }

  cmk_flags = {
    kv = (var.customer_managed_key.enabled && var.customer_managed_key.type == "kv")
  }

  cmk_info = {
    kv = local.cmk_flags.kv ? {
      key_vault_name      = try(split("/", var.customer_managed_key.key_vault_id)[8], "")
      resource_group_name = try(split("/", var.customer_managed_key.key_vault_id)[4], "")
      subscription        = try(split("/", var.customer_managed_key.key_vault_id)[2], "")
      same_subscription   = try((split("/", var.customer_managed_key.key_vault_id)[2] == data.azurerm_subscription.current.subscription_id), false)
      principal_id        = try(coalesce(var.customer_managed_key.user_assigned_identity_id, azurerm_storage_account.this.identity[0].principal_id), "")
    } : {}
  }

  monitoring_logs = [
    "StorageRead",
    "StorageWrite",
    "StorageDelete"
  ]
}
