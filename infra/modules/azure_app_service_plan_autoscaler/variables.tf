variable "tags" {
  type        = map(any)
  description = "Resources tags"
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

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "app_service_plan_id" {
  type        = string
  description = "Set the App Service Plan Id to apply the autoscaler to"
}

variable "app_service_id" {
  type        = string
  description = "Set the App Service or Function App Id to monitor"
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
