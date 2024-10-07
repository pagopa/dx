## Tier Definitions
# Centralized mapping for legacy and new tiers

locals {
  # Tier mappings for better scalability and readability
  tier_map = {
    "test"     = "s"
    "standard" = "m"
    "premium"  = "l"
    "xs"       = "xs"
    "s"        = "s"
    "m"        = "m"
    "l"        = "l"
    "xl"       = "xl"
  }

  # Default to the mapped tier
  tier = local.tier_map[var.tier]

  # SKU name mapping
  sku_name_mapping = {
    "xs" = "F1"
    "s"  = "B1"
    "m"  = "P0v3"
    "l"  = "P1v3"
    "xl" = "P2mv3"
  }

  # Worker process count based on tier
  worker_process_count_mapping = {
    "xs" = 1
    "s"  = 1
    "m"  = 1
    "l"  = 2
    "xl" = 8
  }
}