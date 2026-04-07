variables {
  principal_id    = "00000000-0000-0000-0000-000000000001"
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

mock_provider "azurerm" {}

run "redis_role_assignments_basic" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-legacy-01"
        resource_group_name = "rg-test"
        role                = "reader"
        username            = "test-user"
        description         = "Test reader role"
        is_managed          = false
      }
    ]
  }

  assert {
    condition     = length(module.redis_role_assignments.legacy_assignments) == 1
    error_message = "Should create one legacy Redis assignment"
  }

  assert {
    condition     = module.redis_role_assignments.legacy_assignments["redis-legacy-01|rg-test|reader|test-user"].access_policy_name == "Data Reader"
    error_message = "Reader role should map to Data Reader policy"
  }
}

run "redis_role_assignments_writer" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-legacy-02"
        resource_group_name = "rg-test"
        role                = "writer"
        username            = "app-service"
        description         = "Test writer role"
        is_managed          = false
      }
    ]
  }

  assert {
    condition     = module.redis_role_assignments.legacy_assignments["redis-legacy-02|rg-test|writer|app-service"].access_policy_name == "Data Contributor"
    error_message = "Writer role should map to Data Contributor policy"
  }
}

run "managed_redis_assignment_without_role" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-managed-01"
        resource_group_name = "rg-test"
        role                = null
        username            = null
        description         = "Test managed Redis without role"
        is_managed          = true
      }
    ]
  }

  assert {
    condition     = length(module.redis_role_assignments.managed_assignments) == 1
    error_message = "Should create one managed Redis assignment"
  }

  assert {
    condition     = module.redis_role_assignments.managed_assignments["redis-managed-01|rg-test|managed|"].object_id == "00000000-0000-0000-0000-000000000001"
    error_message = "Managed assignment should use specified principal_id"
  }
}

run "mixed_legacy_and_managed" {
  command = plan

  variables {
    redis = [
      {
        cache_name          = "redis-legacy"
        resource_group_name = "rg-test"
        role                = "reader"
        username            = "reader-user"
        description         = "Legacy reader"
        is_managed          = false
      },
      {
        cache_name          = "redis-managed"
        resource_group_name = "rg-test"
        role                = null
        username            = null
        description         = "Managed assignment"
        is_managed          = true
      }
    ]
  }

  assert {
    condition     = length(module.redis_role_assignments.legacy_assignments) == 1
    error_message = "Should create exactly one legacy assignment"
  }

  assert {
    condition     = length(module.redis_role_assignments.managed_assignments) == 1
    error_message = "Should create exactly one managed assignment"
  }
}

run "empty_redis_list" {
  command = plan

  variables {
    redis = []
  }

  assert {
    condition     = length(module.redis_role_assignments.legacy_assignments) == 0
    error_message = "Empty redis list should create no legacy resources"
  }

  assert {
    condition     = length(module.redis_role_assignments.managed_assignments) == 0
    error_message = "Empty redis list should create no managed resources"
  }
}
