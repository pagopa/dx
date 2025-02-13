locals {
  sku_mapping = {
    "s" = {
      cpu    = 0.25
      memory = "0.5Gi"
      replicas = {
        min = 0
        max = 1
      }
    }
    "m" = {
      cpu    = 0.5
      memory = "1Gi"
      replicas = {
        min = 1
        max = 1
      }
    }
    "l" = {
      cpu : 1
      memory : "2Gi"
      replicas = {
        min = 1
        max = 1
      }
    }
    "xl" = {
      cpu : 1.25
      memory : "2.5Gi"
      replicas = {
        min = 1
        max = 2
      }
    }
  }

  sku = lookup(local.sku_mapping, var.tier, null)

  registry_identity_check = var.registry != null ? var.registry.identity_id != null ? true : false : false
}