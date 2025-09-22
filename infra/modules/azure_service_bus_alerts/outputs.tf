output "dlq" {
  value       = try(azurerm_monitor_metric_alert.dlq[0].id, null)
  description = "Id of the Metric Alert monitoring DLQ message queue size"
}

output "active" {
  value       = try(azurerm_monitor_metric_alert.active[0].id, null)
  description = "Id of the Metric Alert monitoring active message queue size"
}
