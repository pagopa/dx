variable "core_state" {
  type = object({
    bucket         = string
    key            = string
    region         = string
    dynamodb_table = optional(string, null)
  })
  description = "Configuration for accessing the core Terraform state where aws-core-infra module is deployed."
}
