locals {
  norm_application_insights = [for ai in var.application_insights : {
    name                = ai.name
    id                  = "/subscriptions/${var.subscription_id}/resourceGroups/${ai.resource_group_name}/providers/Microsoft.Insights/components/${ai.name}"
    resource_group_name = ai.resource_group_name
    description         = ai.description
  }]
}
