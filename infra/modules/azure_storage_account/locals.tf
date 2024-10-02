locals {
  location_map = {
    "italynorth"         = "itn"
    "westeurope"         = "weu"
    "germanywestcentral" = "gwc"
  }
  location_short  = lookup(local.location_map, var.environment.location, "itn")
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  tiers = {
    s = {
      alerts                     = false
      advanced_threat_protection = false
      account_tier               = "Standard"
      replication_type           = "LRS"
    }

    l = {
      alerts                     = true
      advanced_threat_protection = true
      account_tier               = "Standard"
      replication_type           = "ZRS"
    }
  }

  tier_features = local.tiers[var.tier]

  peps = {
    blob = {
      name     = "${local.app_name_prefix}-blob-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name     = "${local.app_name_prefix}-file-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name     = "${local.app_name_prefix}-queue-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name     = "${local.app_name_prefix}-table-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.table.core.windows.net"
    }
  }
}