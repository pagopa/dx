---
"azure_api_management": patch
---

Replace deprecated `metric` block with `enabled_metric` in monitor diagnostic settings

The Azure provider v4 has deprecated the `metric` block with `enabled` attribute in favor of the new `enabled_metric` block in `azurerm_monitor_diagnostic_setting` resources. This change updates the module to use the non-deprecated block to ensure compatibility with future provider versions.

**Deprecated:**
```terraform
metric {
  category = "AllMetrics"
  enabled  = var.monitoring.metrics.enabled
}
```

**New:**
```terraform
dynamic "enabled_metric" {
  for_each = var.monitoring.metrics.enabled ? ["AllMetrics"] : []
  content {
    category = enabled_metric.value
  }
}
```

This change is fully backward compatible - when metrics are enabled, the block is created; when disabled, no block is created (functionally equivalent to `enabled = false`).

Reference: https://registry.terraform.io/providers/hashicorp/azurerm/4.52.0/docs/resources/monitor_diagnostic_setting.html#enabled_metric-1
