locals {
  location_short  = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  peps = {
    blob = {
      name = "${local.app_name_prefix}-blob-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.blob.core.windows.net"
    }

    file = {
      name = "${local.app_name_prefix}-file-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.file.core.windows.net"
    }

    queue = {
      name = "${local.app_name_prefix}-queue-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.queue.core.windows.net"
    }

    table = {
      name = "${local.app_name_prefix}-table-pep-${var.environment.instance_number}"
      dns_zone = "privatelink.table.core.windows.net"
    }
  }
}