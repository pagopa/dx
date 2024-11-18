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
}
