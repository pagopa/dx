locals {
  sku_mapping = {
    "s" = {
      cpu    = 0.25
      memory = "0.5Gi"
      replicas = {
        min = 0
        max = 1
      }
      zone_redundancy = false
    }
    "m" = {
      cpu    = 0.5
      memory = "1Gi"
      replicas = {
        min = 1
        max = 1
      }
      zone_redundancy = true
    }
    "l" = {
      cpu : 1
      memory : "2Gi"
      replicas = {
        min = 1
        max = 1
      }
      zone_redundancy = true
    }
    "xl" = {
      cpu : 1.25
      memory : "2.5Gi"
      replicas = {
        min = 1
        max = 2
      }
    }
    zone_redundancy = true
  }

  sku = lookup(local.sku_mapping, var.tier, null)
}