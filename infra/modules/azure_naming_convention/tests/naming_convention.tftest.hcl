run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    resource_name = "none"
  }
}

run "name_is_correct" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }

  # Check that name generated is correct
  assert {
    condition     = "${output.prefix}-none-${output.suffix}" == "dx-d-itn-modules-test-${run.setup_tests.resource_name}-01"
    error_message = "Invalid name"
  }
}
