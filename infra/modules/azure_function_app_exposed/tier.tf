## Tier Definitions
# Centralized mapping for legacy and new tiers

locals {
  tags = merge(var.tags, { module_version = try(jsondecode(file("${path.module}/package.json")).version, "unknown") })
  # Tier mappings for better scalability and readability
  tier_map = {
    "test"     = "s"
    "standard" = "m"
    "premium"  = "l"
    "s"        = "s"
    "m"        = "m"
    "l"        = "l"
    "xl"       = "xl"
    "xxl"      = "xxl"
  }

  # Default to the mapped tier
  tier = local.tier_map[var.tier]

  # SKU name mapping
  sku_name_mapping = {
    "s"   = "B1"
    "m"   = "P0v3"
    "l"   = "P1v3"
    "xl"  = "P2mv3"
    "xxl" = "P3mv3"
  }

  # Worker process count based on tier
  worker_process_count_mapping = {
    "s"   = 1
    "m"   = 1
    "l"   = 2
    "xl"  = 8
    "xxl" = 10
  }
}
