variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "env_short" {
  type        = string
  description = "Environment short name"
}

variable "prefix" {
  type        = string
  description = "Project prefix"
}

variable "repo_name" {
  type        = string
  description = "This repository name"
}

variable "container_app_environment" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Name and resource group of the Container App Environment to use as host"
}

variable "key_vault" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Name and resource group of the KeyVault holding secrets for this job"
}

variable "key_vault_secret_name" {
  type        = string
  default     = "github-runner-pat"
  description = "Name of the KeyVault secret containing the GITHUB_PAT value"
}

variable "container_app_job_name" {
  type        = string
  default     = ""
  description = "(Optional) Override Container App Job name auto generated"
}
