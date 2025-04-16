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
  description = "The name of the resource group where the App Service Plan will be created."
}

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "tier" {
  type        = string
  description = "Resource tier. Allowed values are 's', 'm', 'l', 'xl'"

  validation {
    condition     = contains(["s", "m", "l", "xl"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\", or \"xl\"."
  }
}
