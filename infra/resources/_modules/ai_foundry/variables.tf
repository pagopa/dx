variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    domain          = optional(string)
    app_name        = optional(string)
    instance_number = string
  })
  description = "Values used to generate resource names and location short names."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the AI Foundry account."
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "ai_user_principal_ids" {
  type        = list(string)
  default     = []
  description = <<-EOT
  Object IDs of identities (e.g. the AI gateway managed identity) granted the Cognitive Services OpenAI User role on the account.
  EOT
}
