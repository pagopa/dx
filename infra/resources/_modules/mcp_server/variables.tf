variable "naming_config" {
  type = object({
    prefix          = string
    environment     = string
    region          = string
    instance_number = number
  })
}

variable "account_id" {
  type        = string
  description = "The AWS account ID where the MCP server resources will be created."
}

variable "bedrock_knowledge_base_id" {
  type        = string
  description = "The Bedrock knowledge base ID to be used by the MCP server."
}

variable "dns" {
  type = object({
    zone_name           = string
    resource_group_name = string
    custom_domain_name  = string
  })
  description = "DNS configuration for the MCP server, including zone name, resource group name, and custom domain name."
}

variable "cognito_config" {
  description = "Configuration for the Cognito User Pool."
  type = object({
    callback_urls = list(string)
    logout_urls   = list(string)
  })
  default = {
    callback_urls = ["https://api.dev.dx.pagopa.it/mcp/auth/callback"]
    logout_urls   = ["https://api.dev.dx.pagopa.it/mcp/auth/logout"]
  }
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
