variables {
  principal_id    = "11111111-1111-1111-1111-111111111111"
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

mock_provider "azurerm" {}

run "role_assignments_rejects_invalid_managed_redis_id" {
  command = plan
  variables { managed_redis = [{ id = "not-a-resource-id", role = "reader", description = "Invalid ID" }] }
  expect_failures = [var.managed_redis]
}

run "role_assignments_rejects_duplicate_managed_redis_roles" {
  command = plan
  variables {
    managed_redis = [
      { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test", role = "reader", description = "First" },
      { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test", role = "reader", description = "Second" },
    ]
  }
  expect_failures = [var.managed_redis]
}

run "role_assignments_rejects_invalid_managed_redis_role" {
  command = plan
  variables {
    managed_redis = [{ id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cache/redisEnterprise/amr-test", role = "admin", description = "Invalid role" }]
  }
  expect_failures = [var.managed_redis]
}
