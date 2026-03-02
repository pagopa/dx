variable "prefix" {
  type        = string
  description = "Project prefix (2-4 characters). Example: 'io', 'cgn', 'dx'."

  validation {
    condition     = length(var.prefix) >= 2 && length(var.prefix) <= 4
    error_message = "Prefix must be between 2 and 4 characters."
  }
}

variable "environment" {
  type        = string
  description = "Environment short code. Allowed values: 'd' (dev), 'u' (uat), 'p' (prod)."

  validation {
    condition     = contains(["d", "u", "p"], var.environment)
    error_message = "Environment must be 'd', 'u', or 'p'."
  }
}

variable "location" {
  type        = string
  description = "Azure region for resources. Allowed values: 'italynorth', 'westeurope', 'itn', 'weu'."
  default     = "italynorth"

  validation {
    condition     = contains(["italynorth", "westeurope", "itn", "weu"], var.location)
    error_message = "Location must be one of: italynorth, westeurope, itn, weu."
  }
}

variable "domain" {
  type        = string
  description = "Optional domain for resource naming. Example: 'wallet', 'msgs', 'svc'."
  default     = null
}

variable "app_name" {
  type        = string
  description = "Application name for resource naming. Example: 'api', 'worker', 'processor'."
}

variable "instance_number" {
  type        = string
  description = "Two-digit instance number. Example: '01', '02'."
  default     = "01"

  validation {
    condition     = can(regex("^[0-9]{2}$", var.instance_number))
    error_message = "Instance number must be a two-digit string (e.g., '01', '02')."
  }
}

variable "cost_center" {
  type        = string
  description = "Budget tracking identifier for the CostCenter tag. Example: 'TS000 - Tecnologia e Servizi'."
}

variable "environment_tag" {
  type        = string
  description = "Environment tag value. Should match deployment folder: 'Prod', 'Dev', or 'Uat'."

  validation {
    condition     = contains(["Prod", "Dev", "Uat"], var.environment_tag)
    error_message = "Environment tag must be 'Prod', 'Dev', or 'Uat'."
  }
}

variable "business_unit" {
  type        = string
  description = "Product or business unit tag. Example: 'App IO', 'CGN', 'DevEx', 'IT Wallet'."
}

variable "management_team" {
  type        = string
  description = "Team responsible for resource management. Example: 'IO Platform', 'Developer Experience'."
}

variable "source_repo" {
  type        = string
  description = "Link to Terraform source code in GitHub repository. Example: 'https://github.com/pagopa/<repo>/blob/main/infra/resources/prod'."
}

variable "key_vault_name" {
  type        = string
  description = "Name of the existing Key Vault where secrets are stored."
}

variable "key_vault_resource_group_name" {
  type        = string
  description = "Resource group name of the existing Key Vault."
}

variable "function_app_settings" {
  type = list(object({
    name                  = string
    value                 = optional(string, "")
    key_vault_secret_name = optional(string)
  }))
  description = "Function App settings. Use key_vault_secret_name to reference secrets from Key Vault."
  default     = []
}
