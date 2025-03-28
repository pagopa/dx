locals {
  sku_name               = local.sku_name_mapping[var.tier]
  zone_balancing_enabled = var.tier != "s"

  sku_name_mapping = {
    s  = "B1"
    m  = "P0v3"
    l  = "P1v3"
    xl = "P2v3"
  }
}
