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

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}
