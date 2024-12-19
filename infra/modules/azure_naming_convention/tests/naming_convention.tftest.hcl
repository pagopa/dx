run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    resource_name = "none"
  }
}

run "names_is_correct" {
  command = plan

  variables {
    environments = [{
        prefix          = "dx"
        env_short       = "d"
        location        = "italynorth"
        domain          = "modules"
        app_name        = "test"
        instance_number = 1
      },
      {
        prefix          = "dx"
        env_short       = "d"
        location        = "italynorth"
        app_name        = "test2"
        instance_number = 3
      }
    ]
  }

  # Check that name generated is correct
  assert {
    condition     = "${output.prefixes[0]}-none-${output.suffixes[output.prefixes[0]].1}" == "dx-d-itn-modules-test-${run.setup_tests.resource_name}-01"
    error_message = "Invalid name"
  }

  assert {
    condition     = output.names.dx-d-itn-modules-test.function_storage_account.1 == "dxditnmodulesteststfn01"
    error_message = "Storage account name is not correct"
  }

  assert {
    condition     = output.names.dx-d-itn-test2.cosmos_db_nosql.2 == "dx-d-itn-test2-cosno-02"
    error_message = "Cosmos DB name is not correct"
  }
}

run "name_is_correct" {
  command = plan

  variables {
    environments = [{
        prefix          = "dx"
        env_short       = "d"
        location        = "italynorth"
        domain          = "modules"
        app_name        = "test"
        instance_number = 5
      }
    ]
  }

  # Check that name generated is correct
  assert {
    condition     = "${output.prefix}-none-${output.suffix.1}" == "dx-d-itn-modules-test-${run.setup_tests.resource_name}-01"
    error_message = "Invalid name"
  }

  assert {
    condition     = output.name.function_storage_account.2 == "dxditnmodulesteststfn02"
    error_message = "Storage account name is not correct"
  }

  assert {
    condition     = output.name.cosmos_db_nosql.3 == "dx-d-itn-modules-test-cosno-03"
    error_message = "Cosmos DB name is not correct"
  }
}