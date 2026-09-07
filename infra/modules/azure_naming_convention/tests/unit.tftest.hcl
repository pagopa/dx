variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }
}

run "naming_convention_generates_expected_name" {
  command = plan

  assert {
    condition     = "${output.prefix}-none-${output.suffix}" == "dx-u-itn-modules-test-none-01"
    error_message = "The generated name must use the configured environment values."
  }
}
