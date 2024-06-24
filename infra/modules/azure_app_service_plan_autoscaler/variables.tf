variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "target_service" {
  type = object({
    app_service_name  = optional(string)
    function_app_name = optional(string)
  })

  validation {
    condition     = (var.target_service.app_service_name != null) != (var.target_service.function_app_name != null)
    error_message = "Only one between \"app_service_name\" and \"function_app_name\" can have a value. It is not possible to set both of them \"null\"."
  }
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
    }), null)
    normal_load = object({
      default = number
      minimum = number
    })
    maximum = optional(number, 30)
  })

  default = {
    high_load = {
      name = "high_load_profile"
      start = {
        hour    = 19
        minutes = 30
      }
      end = {
        hour    = 22
        minutes = 59
      }
      default = 12
      minimum = 4
    }
    low_load = {
      name = "low_load_profile"
      start = {
        hour    = 23
        minutes = 00
      }
      end = {
        hour    = 05
        minutes = 00
      }
      default = 10
      minimum = 2
    }
    normal_load = {
      default = 11
      minimum = 3
    }
    maximum = 30
  }

  description = "Set the recurrent autoscaling profiles, including start and end time ([hh]:[mm]), the minimum and maximum number of instances and the fallback ("default") value (used when metrics are not available for some technical issue). Outside of low/high load profile time span, \"normal\" load values are used. Each default value can be overridden."
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
