variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "location" {
  type        = string
  description = "The location of the app service plan. Allowed values are \"italynorth\", \"westeurope\", and \"germanywestcentral\"."

  validation {
    condition     = contains(["italynorth", "westeurope", "germanywestcentral"], lower(var.location))
    error_message = "The location must be one of \"italynorth\", \"westeurope\", \"germanywestcentral\"."
  }
}

variable "autoscale_name" {
  type        = string
  description = "Override auto generated name for the autoscaler resource"
  default     = null
}

variable "app_service_plan_id" {
  type        = string
  description = "The id of the app service plan containing the service to autoscale."
}

variable "target_services" {
  type = object({
    app_service = optional(list(object({
      id   = optional(string, null)
      name = optional(string, null)
    })))
    function_app = optional(list(object({
      id   = optional(string, null)
      name = optional(string, null)
    })))
  })

  description = "The target service to autoscale. You can specify either an `app service` or a `function app`, but not both. The id and name attributes are optional, but at least one of them must be provided for the selected service type. Use id if the target service is being created in the same plan."

  validation {
    condition = (
      (var.target_services.app_service != null && var.target_services.function_app == null) ||
      (var.target_services.app_service == null && var.target_services.function_app != null)
    )
    error_message = "You must specify exactly one target service: either 'app_service' or 'function_app', but not both."
  }

  validation {
    condition = (
      # Validazione per app_service quando è presente
      (var.target_services.app_service != null
        ? can(
          [for app in var.target_services.app_service : 
            (app.id != null && app.name == null) || (app.id == null && app.name != null)
          ]
        ) && length(
          [for app in var.target_services.app_service : 
            true if (app.id != null && app.name == null) || (app.id == null && app.name != null)
          ]
        ) == length(var.target_services.app_service)
        : true
      ) && 
      # Validazione per function_app quando è presente
      (var.target_services.function_app != null
        ? can(
          [for func in var.target_services.function_app : 
            (func.id != null && func.name == null) || (func.id == null && func.name != null)
          ]
        ) && length(
          [for func in var.target_services.function_app : 
            true if (func.id != null && func.name == null) || (func.id == null && func.name != null)
          ]
        ) == length(var.target_services.function_app)
        : true
      )
    )
    error_message = "Each object in the selected service type must specify either 'id' or 'name', but not both or neither."
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
    spot_load = optional(object({
      start_date = string
      end_date   = string
      name       = string
      default    = number
      minimum    = number
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

  description = "Set the recurrent autoscaling profiles, including start and end time ([hh]:[mm]), the minimum and maximum number of instances and the fallback (\"default\") value (used when metrics are not available for some technical issue). Outside of low/high load profile time span, \"normal\" load values are used. Each default value can be overridden."
}

variable "scale_metrics" {
  type = object({
    requests = optional(object({
      upper_threshold           = number
      lower_threshold           = number
      increase_by               = number
      decrease_by               = number
      cooldown_increase         = optional(number, 1)
      cooldown_decrease         = optional(number, 10)
      statistic_increase        = optional(string, "Average")
      statistic_decrease        = optional(string, "Average")
      time_aggregation_increase = optional(string, "Average")
      time_aggregation_decrease = optional(string, "Average")
      time_window_increase      = optional(number, 1)
      time_window_decrease      = optional(number, 1)
    }), null)
    cpu = optional(object({
      upper_threshold           = optional(number, 80)
      lower_threshold           = optional(number, 20)
      increase_by               = optional(number, 1)
      decrease_by               = optional(number, 1)
      cooldown_increase         = optional(number, 1)
      cooldown_decrease         = optional(number, 20)
      statistic_increase        = optional(string, "Average")
      statistic_decrease        = optional(string, "Average")
      time_aggregation_increase = optional(string, "Average")
      time_aggregation_decrease = optional(string, "Average")
      time_window_increase      = optional(number, 5)
      time_window_decrease      = optional(number, 5)
    }), {})
    memory = optional(object({
      upper_threshold           = optional(number, 70)
      lower_threshold           = optional(number, 20)
      increase_by               = optional(number, 1)
      decrease_by               = optional(number, 1)
      cooldown_increase         = optional(number, 1)
      cooldown_decrease         = optional(number, 5)
      statistic_increase        = optional(string, "Average")
      statistic_decrease        = optional(string, "Average")
      time_aggregation_increase = optional(string, "Average")
      time_aggregation_decrease = optional(string, "Average")
      time_window_increase      = optional(number, 5)
      time_window_decrease      = optional(number, 5)
    }), null)
  })

  description = "Set the metrics to monitor. CPU is mandatory, Memory and Requests are not. Each attribute has a default value that can be overridden"

  default = {
    requests = null
    cpu = {
      upper_threshold           = 80
      lower_threshold           = 20
      increase_by               = 1
      decrease_by               = 1
      cooldown_increase         = 1
      cooldown_decrease         = 20
      statistic_increase        = "Average"
      statistic_decrease        = "Average"
      time_aggregation_increase = "Average"
      time_aggregation_decrease = "Average"
      time_window_increase      = 5
      time_window_decrease      = 5
    }
    memory = null
  }

  validation {
    condition     = var.scale_metrics.cpu != null
    error_message = "CPU metrics can't be null"
  }

  validation {
    condition = alltrue([
      # Statistic
      can(var.scale_metrics.requests.statistic_increase) ? contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.requests.statistic_increase) : true,
      can(var.scale_metrics.requests.statistic_decrease) ? contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.requests.statistic_decrease) : true,
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.cpu.statistic_increase),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.cpu.statistic_decrease),
      can(var.scale_metrics.memory.statistic_increase) ? contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.memory.statistic_increase) : true,
      can(var.scale_metrics.memory.statistic_decrease) ? contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.memory.statistic_decrease) : true,
    ])
    error_message = "Each Statistic metric trigger must be one of the following values: Average, Max, Min, or Sum."
  }

  validation {
    condition = alltrue([
      can(var.scale_metrics.requests.time_aggregation_increase) ? contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.requests.time_aggregation_increase) : true,
      can(var.scale_metrics.requests.time_aggregation_decrease) ? contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.requests.time_aggregation_decrease) : true,
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.cpu.time_aggregation_increase),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.cpu.time_aggregation_decrease),
      can(var.scale_metrics.memory.time_aggregation_increase) ? contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.memory.time_aggregation_increase) : true,
      can(var.scale_metrics.memory.time_aggregation_decrease) ? contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.memory.time_aggregation_decrease) : true,
    ])
    error_message = "Each Time aggregation metric trigger must be one of the following values: Average, Count, Maximum, Minimum, Last or Total."
  }
}
