variable "environments" {
  type = list(object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = number
  }))

  validation {
    condition     = alltrue([for env in var.environments : length(env.prefix) == 2])
    error_message = "Each environment's prefix must contain exactly 2 characters."
  }

  validation {
    condition     = alltrue([for env in var.environments : length(env.app_name) > 1])
    error_message = "The variable \"app_name\" must contain at least 2 characters"
  }

  validation {
    condition     = alltrue([for env in var.environments : contains(["d", "u", "p"], env.env_short)])
    error_message = "Allowed values for env_short are 'd', 'u', 'p'."
  }

  validation {
    condition     = alltrue([for env in var.environments : contains(["italynorth", "westeurope", "germanywestcentral", "spaincentral", "northeurope"], env.location)])
    error_message = "Invalid location. Allowed values are: 'italynorth', 'westeurope', 'germanywestcentral', 'spaincentral', 'northeurope'."
  }

  validation {
    condition     = alltrue([for env in var.environments : env.instance_number > 0 && env.instance_number < 100])
    error_message = "The variable \"instance_number\" only accepts values in the range [1-99]."
  }

  validation {
    condition     = alltrue([for env in var.environments : env.domain == null ? true : length(replace(env.domain, "-", "")) >= 2])
    error_message = "\"domain\" value must be null or a value of at least 2 characters"
  }

  validation {
    condition     = alltrue([for env in var.environments : length(env.app_name) > 1])
    error_message = "The variable \"app_name\" must contain at least 2 characters"
  }

  description = "List of values which are used to generate resource names and location short names for each environment. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."

}
