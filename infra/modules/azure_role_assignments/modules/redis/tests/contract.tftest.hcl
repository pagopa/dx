variables {
  principal_id    = "00000000-0000-0000-0000-000000000001"
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

mock_provider "azurerm" {}

run "invalid_legacy_role" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-legacy"
        resource_group_name = "rg-test"
        role                = "invalid_role"
        username            = "user"
        description         = "Test"
        is_managed          = false
      }
    ]
  }

  expect_failures = [
    var.redis,
  ]
}

run "missing_role_for_legacy" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-legacy"
        resource_group_name = "rg-test"
        role                = null
        username            = "user"
        description         = "Test"
        is_managed          = false
      }
    ]
  }

  expect_failures = [
    var.redis,
  ]
}

run "valid_managed_without_role" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-managed"
        resource_group_name = "rg-test"
        role                = null
        username            = null
        description         = "Test"
        is_managed          = true
      }
    ]
  }

  assert {
    condition     = length(module.redis_role_assignments.managed_assignments) == 1
    error_message = "Managed Redis without role should be valid"
  }
}

run "valid_legacy_roles" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-reader"
        resource_group_name = "rg-test"
        role                = "reader"
        username            = "user-reader"
        description         = "Reader"
        is_managed          = false
      },
      {
        cache_name          = "redis-writer"
        resource_group_name = "rg-test"
        role                = "writer"
        username            = "user-writer"
        description         = "Writer"
        is_managed          = false
      },
      {
        cache_name          = "redis-owner"
        resource_group_name = "rg-test"
        role                = "owner"
        username            = "user-owner"
        description         = "Owner"
        is_managed          = false
      }
    ]
  }

  assert {
    condition     = length(module.redis_role_assignments.legacy_assignments) == 3
    error_message = "All three legacy roles should be valid"
  }
}

run "duplicate_assignments_fail" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-01"
        resource_group_name = "rg-test"
        role                = "reader"
        username            = "user"
        description         = "Test 1"
        is_managed          = false
      },
      {
        cache_name          = "redis-01"
        resource_group_name = "rg-test"
        role                = "reader"
        username            = "user"
        description         = "Test 2"
        is_managed          = false
      }
    ]
  }

  expect_failures = [
    var.redis,
  ]
}

run "empty_redis_list_valid" {
  command = plan

  variables {
    redis = []
  }

  assert {
    condition     = length(module.redis_role_assignments.legacy_assignments) == 0
    error_message = "Empty redis list should create no resources"
  }

  assert {
    condition     = length(module.redis_role_assignments.managed_assignments) == 0
    error_message = "Empty redis list should create no managed resources"
  }
}
