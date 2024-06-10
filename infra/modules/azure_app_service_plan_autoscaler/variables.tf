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
    high_load = object({
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
    })
    low_load = object({
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
    })
    normal_load = object({
      start = object({
        hour    = number
        minutes = number
      })
      end = object({
        hour    = number
        minutes = number
      })
      default = number
      minimum = number
      maximum = number
    })
  })
  default = null
}

variable "scale_metrics" {
  type = object({
    requests = object({
      upper_threshold = number
      lower_threshold = number
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
    })
    cpu = object({
      upper_threshold = number
      lower_threshold = number
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
    })
    memory = object({
      upper_threshold = number
      lower_threshold = number
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
    })
  })
}
