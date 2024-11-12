locals {
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
      name     = "${module.naming_convention.prefix}-blob-pep-${module.naming_convention.suffix}"
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name     = "${module.naming_convention.prefix}-file-pep-${module.naming_convention.suffix}"
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name     = "${module.naming_convention.prefix}-queue-pep-${module.naming_convention.suffix}"
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name     = "${module.naming_convention.prefix}-table-pep-${module.naming_convention.suffix}"
      dns_zone = "privatelink.table.core.windows.net"
    }
  }

  cmk_flags = {
    kv = (var.customer_managed_key.enabled && var.customer_managed_key.type == "kv")
  }

  cmk_info = {
    kv = local.cmk_flags.kv ? {
      key_vault_name      = split("/", var.customer_managed_key.key_vault_id)[8]
      resource_group_name = split("/", var.customer_managed_key.key_vault_id)[4]
      subscription        = split("/", var.customer_managed_key.key_vault_id)[2]
      same_subscription   = split("/", var.customer_managed_key.key_vault_id)[2] == data.azurerm_subscription.current.subscription_id
      principal_id        = coalesce(var.customer_managed_key.user_assigned_identity_id, azurerm_storage_account.this.identity[0].principal_id)
    } : {}
  }
}
