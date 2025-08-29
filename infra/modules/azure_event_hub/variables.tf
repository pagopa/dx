#---------#
# General #
#---------#

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-evhns-${var.environment.instance_number}") <= 256
    error_message = "Azure Event HUB name must contain between 1 and 256 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-evhns-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

variable "eventhubs" {
  description = "A list of event hubs to add to namespace."
  type = list(object({
    name                   = string       # (Required) Specifies the name of the EventHub resource. Changing this forces a new resource to be created.
    partitions             = number       # (Required) Specifies the current number of shards on the Event Hub.
    message_retention_days = number       # (Required) Specifies the number of days to retain the events for this Event Hub.
    consumers              = list(string) # Manages a Event Hubs Consumer Group as a nested resource within an Event Hub.
    keys = list(object({
      name   = string # (Required) Specifies the name of the EventHub Authorization Rule resource. Changing this forces a new resource to be created.
      listen = bool   # (Optional) Does this Authorization Rule have permissions to Listen to the Event Hub? Defaults to false.
      send   = bool   # (Optional) Does this Authorization Rule have permissions to Send to the Event Hub? Defaults to false.
      manage = bool   # (Optional) Does this Authorization Rule have permissions to Manage to the Event Hub? When this property is true - both listen and send must be too. Defaults to false.
    }))               # Manages a Event Hubs authorization Rule within an Event Hub.
  }))
  default = []
}

#------------#
# Networking #
#------------#

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group."
  default     = null
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for private endpoints."
}

variable "allowed_sources" {
  type = object({
    subnet_ids = optional(list(string), [])
    ips        = optional(list(string), [])
  })
  default     = {}
  description = "Lists of allowed sources for accessing the Event Hub, including subnet IDs and IP address ranges."
}

#----------------#
# Administration #
#----------------#

variable "use_case" {
  type        = string
  description = "Specifies the use case for the Event Hub. Allowed value is 'default'."
  default     = "default"

  validation {
    condition     = contains(["default"], var.use_case)
    error_message = "Allowed value for \"use_case\" is \"default\"."
  }
}

#------------#
# Monitoring #
#------------#

variable "action_group_id" {
  type        = string
  description = "The ID of the Action Group to invoke when an alert is triggered for the Event Hub."
  default     = null
}

variable "metric_alerts" {
  description = "Map of name = criteria objects"

  type = map(object({
    aggregation = string # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]
    metric_name = string # https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference
    description = string
    operator    = string # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]
    threshold   = number
    frequency   = string # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H
    window_size = string # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.
  }))
  default = {}
}