locals {

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  tiers = {
    s = {
      alerts                     = false
      advanced_threat_protection = false
      account_tier               = "Standard"
      replication_type           = "LRS"
    }

    l = {
      alerts                     = true
      advanced_threat_protection = var.environment.location != "italynorth"
      account_tier               = "Standard"
      replication_type           = "ZRS"
    }
  }

  tier_features = local.tiers[var.tier]

  peps = {
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
}
