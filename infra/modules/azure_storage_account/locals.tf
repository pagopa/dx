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
      name     = module.naming_convention.name.blob_private_endpoint["1"]
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name     = module.naming_convention.name.file_private_endpoint["1"]
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name     = module.naming_convention.name.queue_private_endpoint["1"]
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name     = module.naming_convention.name.table_private_endpoint["1"]
      dns_zone = "privatelink.table.core.windows.net"
    }
  }
}
