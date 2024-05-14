locals {
  project = "${var.prefix}-${var.env_short}-${var.location_short}"

  sku_name               = var.env_short == "p" ? "P1v3" : "B1"
  zone_balancing_enabled = var.env_short == "p"
}
