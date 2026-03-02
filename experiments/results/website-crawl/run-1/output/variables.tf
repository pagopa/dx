variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  description = "Values used to generate resource names and location short names."
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Details of the existing virtual network."
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for private endpoints."
}

variable "key_vault_name" {
  type        = string
  description = "Name of the Key Vault for secrets references."
}

variable "app_settings_secrets" {
  type = list(object({
    name                  = string
    key_vault_secret_name = string
  }))
  description = "Application settings that reference secrets from Key Vault."
  default     = []
}
