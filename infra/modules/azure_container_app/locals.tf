locals {
  sku_mapping = {
    "xs" = {
      cpu    = 0.25
      memory = "0.5Gi"
      replicas = {
        min = 0
        max = 1
      }
    }
    "s" = {
      cpu    = 0.5
      memory = "1Gi"
      replicas = {
        min = 1
        max = 1
      }
    }
    "m" = {
      cpu    = 1.25
      memory = "2.5Gi"
      replicas = {
        min = 1
        max = 2
      }
    }
    "l" = {
      cpu    = 2
      memory = "4Gi"
      replicas = {
        min = 2
        max = 4
      }
    }
  }

  sku = lookup(local.sku_mapping, var.tier, null)
}