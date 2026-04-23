locals {
  # Azure Managed Redis only exposes a single built-in access policy
  # ("default") and the provider resource has no knob to select a different
  # one (see `azurerm_managed_redis_access_policy_assignment`). The "role"
  # field on the input is therefore kept for API parity with the other
  # sub-modules and for future-proofing (e.g. if custom access policies are
  # introduced), but it does not drive the assignment name or scope here.

  norm_instances = [for instance in var.managed_redis : {
    name                = instance.name
    managed_redis_id    = "/subscriptions/${var.subscription_id}/resourceGroups/${instance.resource_group_name}/providers/Microsoft.Cache/redisEnterprise/${instance.name}"
    resource_group_name = instance.resource_group_name
    role                = instance.role
  }]

  # At the Azure API level there is a single access policy assignment per
  # (instance, principal) because every role maps to the "default" policy.
  # We therefore key the for_each on "{name}|{rg}" only.
  assignments = {
    for assignment in local.norm_instances : "${assignment.name}|${assignment.resource_group_name}" => assignment
  }
}
