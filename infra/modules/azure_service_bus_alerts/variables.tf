variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "alerts_on_active_messages" {
  type = object({
    description     = string
    entity_names    = list(string)
    threshold       = optional(number, 10)
    severity        = optional(string, "Warning")
    auto_mitigate   = optional(bool, true)
    check_every     = optional(string, "PT15M")
    lookback_period = optional(string, "PT30M")
    enable          = optional(bool, true)
  })

  default     = null
  description = <<EOF
"Configure alert over messages moved in dead-letter queue. If set to null, no alert will be created
- "description": used to describe the alert in Azure Monitor
- "entity_names": list of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string
- "threshold": the average number of messages that triggers the alert. It is compared using GreaterThan operator. Default value is 10.
- "severity": valid values are "Critical", "Error", "Warning", "Informational" or "Verbose" (case-sensitive). Default is "Warning"
- "auto_mitigate": indicates whether the alert should automatically resolve when the condition is no longer met. Default is true"
- "check_every": frequency at which the alert rule is evaluted. Default is PT15M (15 minutes). Valid values are ISO 8601 durations"
- "lookback_period": the time window over which the alert rule is evaluated. Default is PT30M (30 minutes). Valid values are ISO 8601 durations"
- "enable": indicates whether alerts are enabled or not. Default is true
EOF

  validation {
    condition     = var.alerts_on_active_messages == null ? true : length(var.alerts_on_active_messages.entity_names) > 0
    error_message = "\"dlq_alerts\" must contain at least one entity name in the \"entity_names\" list."
  }

  validation {
    condition     = var.alerts_on_active_messages == null ? true : var.alerts_on_active_messages.threshold >= 0
    error_message = "\"dlq_alerts.threshold\" must be greater than or equal to 0."
  }

  validation {
    condition     = var.alerts_on_active_messages == null ? true : contains(["Critical", "Error", "Warning", "Informational", "Verbose"], var.alerts_on_active_messages.severity)
    error_message = "Allowed values for \"severity\" are \"Critical\", \"Error\", \"Warning\", \"Informational\" or \"Verbose\". Values are case-sensitive."
  }
}

variable "alerts_on_dlq_messages" {
  type = object({
    description     = string
    entity_names    = list(string)
    threshold       = optional(number, 0)
    severity        = optional(string, "Error")
    auto_mitigate   = optional(bool, true)
    check_every     = optional(string, "PT1M")
    lookback_period = optional(string, "PT5M")
  })

  default     = null
  description = <<EOF
"Configure alert over messages moved in dead-letter queue. If set to null, no alert will be created.
- "description": used to describe the alert in Azure Monitor
- "entity_names": list of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string
- "threshold": the average number of messages that triggers the alert. It is compared using GreaterThan operator. Default value is 0
- "severity": valid values are "Critical", "Error", "Warning", "Informational" or "Verbose" (case-sensitive). Default is "Error"
- "auto_mitigate": indicates whether the alert should automatically resolve when the condition is no longer met. Default is true"
- "check_every": frequency at which the alert rule is evaluted. Default is PT1M (1 minute). Valid values are ISO 8601 durations"
- "lookback_period": the time window over which the alert rule is evaluated. Default is PT5M (5 minutes). Valid values are ISO 8601 durations"
- "enable": indicates whether alerts are enabled or not. Default is true
EOF

  validation {
    condition     = var.alerts_on_dlq_messages == null ? true : length(var.alerts_on_dlq_messages.entity_names) > 0
    error_message = "\"dlq_alerts\" must contain at least one entity name in the \"entity_names\" list."
  }

  validation {
    condition     = var.alerts_on_dlq_messages == null ? true : var.alerts_on_dlq_messages.threshold >= 0
    error_message = "\"dlq_alerts.threshold\" must be greater than or equal to 0."
  }

  validation {
    condition     = var.alerts_on_dlq_messages == null ? true : contains(["Critical", "Error", "Warning", "Informational", "Verbose"], var.alerts_on_dlq_messages.severity)
    error_message = "Allowed values for \"severity\" are \"Critical\", \"Error\", \"Warning\", \"Informational\" or \"Verbose\". Values are case-sensitive."
  }
}

variable "service_bus_namespace_id" {
  type        = string
  description = "Id of the Service Bus Namespace to monitor for dead-lettered messages"
}

variable "action_group_ids" {
  type        = list(string)
  description = "Id list of the action groups to notify when the alert is triggered"
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}
