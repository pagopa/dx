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

variable "entity_names" {
  type        = list(string)
  description = "List of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string."
}

variable "threshold" {
  type        = number
  default     = 0
  description = "Threshold for the number of dead-lettered messages that triggers the alert. Default is 0."
}

variable "service_bus_namespace_id" {
  type        = string
  description = "Id of the Service Bus Namespace to monitor for dead-lettered messages"
}

variable "description" {
  type        = string
  description = "Description of the alert"
}

variable "action_group_ids" {
  type        = list(string)
  description = "Id list of the action groups to notify when the alert is triggered"
}

variable "severity" {
  type        = string
  default     = "Error"
  description = "The severity of the alert. Default is Error. Valid values are Critical, Error, Warning, Informational, and Verbose."

  validation {
    condition     = contains(["Critical", "Error", "Warning", "Informational", "Verbose"], var.severity)
    error_message = "Allowed values for \"severity\" are \"Critical\", \"Error\", \"Warning\", \"Informational\" or \"Verbose\". Values are case-sensitive."
  }
}

variable "auto_mitigate" {
  type        = bool
  default     = true
  description = "Indicates whether the alert should automatically resolve when the condition is no longer met. Default is true."
}

variable "enable" {
  type        = bool
  default     = true
  description = "Indicates whether the alert is enabled. Default is true"
}

variable "frequency" {
  type        = string
  default     = "PT1M"
  description = "The frequency at which the alert rule is evaluted. Default is PT1M (1 minute). Valid values are ISO 8601 durations"
}

variable "window_size" {
  type        = string
  default     = "PT5M"
  description = "The time window over which the alert rule is evaluated. Default is PT5M (5 minutes). Valid values are ISO 8601 durations"
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}
