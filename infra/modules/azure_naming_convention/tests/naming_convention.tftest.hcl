run "setup_tests" {
  module {
    source = "./tests/setup"
  }
  
  variables {
    resource_name = "none"
    resource_type = "Storage Account"
  }
}

run "name_is_correct" {
  command = plan

  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    resource_type = run.setup_tests.resource_type
  }

  # Check that name generated is correct
  assert {
    condition     = "${output.prefix}-none-${output.suffix}" == "io-p-itn-modules-test-${run.setup_tests.resource_name}-01"
    error_message = "Invalid name"
  }

  assert {
    condition     = run.setup_tests.resource_type == "None" ? output.name == null : output.name == "${output.prefix}-st-${output.suffix}"
    error_message = "No name definition"
  }
}