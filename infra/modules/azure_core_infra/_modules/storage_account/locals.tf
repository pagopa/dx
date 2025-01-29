locals {
  tiers = {
    s = {
      advanced_threat_protection = false
      account_tier               = "Standard"
      replication_type           = "LRS"
    }

    l = {
      advanced_threat_protection = var.location != "italynorth"
      account_tier               = "Standard"
      replication_type           = "ZRS"
    }
  }

  tier_features = local.tiers[var.tier]

  peps = {
    blob = {
      name     = "${var.prefix}-blob-pep-${var.suffix}"
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name     = "${var.prefix}-file-pep-${var.suffix}"
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name     = "${var.prefix}-queue-pep-${var.suffix}"
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name     = "${var.prefix}-table-pep-${var.suffix}"
      dns_zone = "privatelink.table.core.windows.net"
    }
  }
}
