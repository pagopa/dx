variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "entraid_groups" {
  type = object({
    admins    = string
    devs      = string
    externals = optional(string)
  })

  description = "Azure Entra Id groups to give role to"
}

variable "terraform_storage_account" {
  type = object({
    resource_group_name = string
    name                = string
  })

  description = "Name and resource group name of the Storage Account hosting the Terraform state file"
}

variable "subscription_id" {
  type        = string
  description = "The subscription ID where resources are created"
}
