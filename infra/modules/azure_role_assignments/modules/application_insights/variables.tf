variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "application_insights" {
  description = "A list of Application Insights role assignments. Assigns the Monitoring Metrics Publisher role, which allows publishing custom metrics."
  type = list(object({
    name                = string
    resource_group_name = string
    description         = string
  }))

  validation {
    condition     = length(var.application_insights) == length(distinct(var.application_insights))
    error_message = "Each assignment must be unique. Found ${length(var.application_insights) - length(distinct(var.application_insights))} duplicates."
  }

  default = []
}
