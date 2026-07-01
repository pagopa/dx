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
  description = "The name of the resource group in which to create the API Management gateway."
}

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "virtual_network" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "The common virtual network hosting the gateway. The APIM subnet is created here and the gateway is reachable only from within this network."
}

variable "foundry" {
  type = object({
    project_id            = string
    project_endpoint      = string
    model_deployment_name = string
  })
  description = "The AI Foundry project the gateway proxies to: project ID (for RBAC), project endpoint, and the model deployment name."
}

variable "application_insights" {
  type = object({
    id                = string
    connection_string = string
  })
  description = "The core Application Insights instance used by API Management for request diagnostics."
}
