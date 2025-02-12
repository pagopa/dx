# ------------ GENERAL ------------ #
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
# ------------ CONTAINER ENVIRONMENT ------------ #

variable "create_container_app_environment" {
  type        = bool
  description = "Determines whether to create a new Container App Environment"
  default     = false
}

variable "container_app_environment_id" {
  type        = string
  description = "The ID of the container app environment to deploy the container app to. If not provided, a new container app environment will be created."
  default     = null
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to use for the container app environment."
  default     = null
}

# ------------ CONTAINER APP ------------ #

variable "tier" {
  type        = string
  description = "The offer type for the Container. Valid values are 's', 'm', 'l' and 'xl'."
  default     = "s"

  validation {
    condition     = contains(["s", "m", "l", "xl"], var.tier)
    error_message = "Valid values for tier are 's', 'm', 'l' and 'xl'."
  }
}

variable "container_app_template" {
  type = object({
    image = string
    name  = string
    envs  = optional(map(string), {})
  })

  description = "The template for the container app to deploy"
}

variable "key_vault" {
  type = object({
    name                = string
    resource_group_name = string
    use_rbac            = optional(bool, false)
    secret_name         = string
  })
  default     = null
  description = "Details of the KeyVault holding secrets for this Container"
}
