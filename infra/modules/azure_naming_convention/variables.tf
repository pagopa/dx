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
    condition     = length(var.environment.prefix) == 2
    error_message = "The variable \"app_name\" must contain 2 characters"
  }

  validation {
    condition     = contains(["d", "u", "p"], var.environment.env_short)
    error_message = "Allowed values for \"env_short\" are \"d\", \"u\", \"p\"."
  }

  validation {
    condition     = contains(["italynorth", "westeurope", "germanywestcentral", "northeurope"], var.environment.location)
    error_message = "Allowed values for \"location\" are \"italynorth\" \"westeurope\", \"germanywestcentral\", \"northeurope\"."
  }

  validation {
    condition     = var.environment.domain == null ? true : length(replace(var.environment.domain, "-", "")) >= 2
    error_message = "\"domain\" variable must be null or a value of at least 2 characters"
  }

  validation {
    condition     = length(var.environment.app_name) > 1
    error_message = "The variable \"app_name\" must contain at least 2 characters"
  }

  validation {
    condition     = can(regex("^(0[1-9]|[1-9][0-9])$", var.environment.instance_number))
    error_message = "The variable \"instance_number\" only accepts values in the range [01-99] as strings."
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}
