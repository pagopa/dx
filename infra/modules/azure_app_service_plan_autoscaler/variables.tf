variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "app_service_name" {
  type        = string
  description = "Set name of the App Service to monitor"
  default     = null
}

variable "function_app_name" {
  type        = string
  description = "Set the name of the Function App to monitor"
  default     = null
}

variable "scheduler" {
  type = object({
    high_load = optional(object({
      start = object({
        hour    = number
        minutes = number
      })
      end = object({
        hour    = number
        minutes = number
      })
      name    = string
      default = number
      minimum = number
      maximum = number
    }), null)
    low_load = optional(object({
      start = object({
        hour    = number
        minutes = number
      })
      end = object({
        hour    = number
        minutes = number
      })
      name    = string
      default = number
      minimum = number
      maximum = number
    }), null)
    normal_load = object({
      default = number
      minimum = number
      maximum = number
    })
  })

  description = "Set the recurrent autoscaling actions"
}

variable "scale_metrics" {
  type = object({
    requests = optional(object({
      upper_threshold = number
      lower_threshold = number
      increase_by     = number
      decrease_by     = number
    }), null)
    cpu = optional(object({
      upper_threshold = optional(number, 80)
      lower_threshold = optional(number, 20)
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
      }), {
      upper_threshold = 80
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    })
    memory = optional(object({
      upper_threshold = optional(number, 70)
      lower_threshold = optional(number, 20)
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
      }), {
      upper_threshold = 70
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    })
  })

  description = "(Optional) Set the metrics to monitor. CPU and Memory are mandatory, Requests is not. Each attribute has a default value that can be overridden"

  default = {
    requests = null
    cpu = {
      upper_threshold = 80
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    }
    memory = {
      upper_threshold = 70
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    }
  }

  validation {
    condition     = var.scale_metrics.cpu != null
    error_message = "CPU metrics can't be null"
  }

  validation {
    condition     = var.scale_metrics.memory != null
    error_message = "Memory metrics can't be null"
  }
}
