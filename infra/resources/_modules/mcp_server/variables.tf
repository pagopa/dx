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

variable "application_insights_connection_string" {
  type        = string
  description = "The Application Insights connection string for monitoring and logging."
  sensitive   = true
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "waf_rate_limit_per_ip" {
  type        = number
  description = "Maximum number of requests per IP address within the evaluation window (5 minutes). Requests exceeding this limit will be blocked."
  default     = 2000
}
