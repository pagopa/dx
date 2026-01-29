variable "role_name" {
  description = "Name of the custom role definition to create."
  type        = string
}

variable "source_roles" {
  description = "List of built-in Azure role names to merge into a custom role definition."
  type        = list(string)
}
