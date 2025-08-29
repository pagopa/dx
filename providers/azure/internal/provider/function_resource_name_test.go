package provider

import (
	"regexp"
	"testing"

	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
	"github.com/hashicorp/terraform-plugin-testing/knownvalue"
	"github.com/hashicorp/terraform-plugin-testing/statecheck"
	"github.com/hashicorp/terraform-plugin-testing/tfversion"
)

func TestResourceNameFunction_Known(t *testing.T) {
	t.Parallel()

	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						domain = "test",
						environment = "d",
						location = "itn",
						name = "example",
						resource_type = "subnet",
						instance_number = 1
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-d-itn-test-example-snet-01")),
				},
			},
		},
	})
}

func TestResourceNameFunction_InvalidLocation(t *testing.T) {
	t.Parallel()
	// Test to verify the error when location is invalid
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						domain = "test",
						environment = "d",
						location = "usa", // Invalid location
						name = "example",
						resource_type = "subnet",
						instance_number = 5
					})
        }
        `,
				ExpectError: regexp.MustCompile(`Location must be one of: westeurope, italynorth, weu, itn`),
			},
		},
	})
}

func TestResourceNameFunction_InvalidInstanceNumber(t *testing.T) {
	t.Parallel()
	// Test to verify the error when instance number is outside the allowed range
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						domain = "test",
						environment = "d",
						location = "itn",
						name = "example",
						resource_type = "subnet",
						instance_number = 100 // Out of range number
					})
        }
        `,
				ExpectError: regexp.MustCompile("Instance must be between 1 and 99"),
			},
		},
	})
}

func TestResourceNameFunction_InvalidResourceType(t *testing.T) {
	t.Parallel()
	// Test to verify the error when resource type is invalid
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						domain = "test",
						environment = "d",
						location = "itn",
						name = "example",
						resource_type = "invalid_type", // Invalid type
						instance_number = 1
					})
        }
        `,
				ExpectError: regexp.MustCompile("resource 'invalid_type' not found"),
			},
		},
	})
}

func TestResourceNameFunction_MissingConfiguration(t *testing.T) {
	t.Parallel()
	// Test to verify the error when required configurations are missing
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({}) // Empty configuration
        }
        `,
				ExpectError: regexp.MustCompile("Missing key in input"),
			},
		},
	})
}

func TestResourceNameFunction_WithoutDomain(t *testing.T) {
	t.Parallel()
	// Test to verify resource name generation without domain
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "d",
						location = "weu",
						name = "example",
						resource_type = "app_service",
						instance_number = "1"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-d-weu-example-app-01")),
				},
			},
		},
	})
}

func TestResourceNameFunction_StorageAccountSpecialHandling(t *testing.T) {
	t.Parallel()
	// Test to verify storage account naming removes dashes
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "p",
						location = "westeurope",
						name = "example",
						resource_type = "storage_account",
						instance_number = "5"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dxpweuexamplest05")),
				},
			},
		},
	})
}

func TestResourceNameFunction_FunctionStorageAccountSpecialHandling(t *testing.T) {
	t.Parallel()
	// Test to verify function storage account naming removes dashes
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "u",
						location = "itn",
						name = "myfunction",
						resource_type = "function_storage_account",
						instance_number = "2"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dxuitnmyfunctionstfn02")),
				},
			},
		},
	})
}

func TestResourceNameFunction_AllEnvironments(t *testing.T) {
	t.Parallel()
	// Test all valid environments: d, u, p
	testCases := []struct {
		environment string
		expected    string
	}{
		{"d", "dx-d-weu-test-vm-01"},
		{"u", "dx-u-weu-test-vm-01"},
		{"p", "dx-p-weu-test-vm-01"},
	}

	for _, tc := range testCases {
		t.Run("environment_"+tc.environment, func(t *testing.T) {
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: `
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "` + tc.environment + `",
								location = "weu",
								name = "test",
								resource_type = "virtual_machine",
								instance_number = "1"
							})
            }
            `,
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}

func TestResourceNameFunction_AllLocations(t *testing.T) {
	t.Parallel()
	// Test all valid location mappings
	testCases := []struct {
		location string
		expected string
	}{
		{"weu", "dx-d-weu-test-vm-01"},
		{"westeurope", "dx-d-weu-test-vm-01"},
		{"itn", "dx-d-itn-test-vm-01"},
		{"italynorth", "dx-d-itn-test-vm-01"},
	}

	for _, tc := range testCases {
		t.Run("location_"+tc.location, func(t *testing.T) {
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: `
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "d",
								location = "` + tc.location + `",
								name = "test",
								resource_type = "virtual_machine",
								instance_number = "1"
							})
            }
            `,
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}

func TestResourceNameFunction_NewResourceTypes(t *testing.T) {
	t.Parallel()
	// Test some of the newly added resource types
	testCases := []struct {
		resourceType string
		abbreviation string
	}{
		{"container_app_job", "caj"},
		{"dns_forwarding_ruleset", "dnsfrs"},
		{"dns_private_resolver", "dnspr"},
		{"key_vault_private_endpoint", "kv-pep"},
		{"ai_search", "srch"},
		{"load_testing", "lt"},
		{"monitor_alert_sbns_active", "sbns-act-ma"},
		{"monitor_alert_sbns_dlq", "sbns-dlq-ma"},
	}

	for _, tc := range testCases {
		t.Run("resource_type_"+tc.resourceType, func(t *testing.T) {
			expectedName := "dx-d-weu-test-" + tc.abbreviation + "-01"
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: `
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "d",
								location = "weu",
								name = "test",
								resource_type = "` + tc.resourceType + `",
								instance_number = "1"
							})
            }
            `,
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(expectedName)),
						},
					},
				},
			})
		})
	}
}

func TestResourceNameFunction_InvalidEnvironment(t *testing.T) {
	t.Parallel()
	// Test invalid environment values
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "invalid",
						location = "weu",
						name = "test",
						resource_type = "virtual_machine",
						instance_number = "1"
					})
        }
        `,
				ExpectError: regexp.MustCompile(`Environment must be\s+'d', 'u' or 'p'`),
			},
		},
	})
}

func TestResourceNameFunction_InvalidPrefix(t *testing.T) {
	t.Parallel()
	// Test invalid prefix length
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "toolong",
						environment = "d",
						location = "weu",
						name = "test",
						resource_type = "virtual_machine",
						instance_number = "1"
					})
        }
        `,
				ExpectError: regexp.MustCompile(`Prefix must be 2\s+characters long`),
			},
		},
	})
}

func TestResourceNameFunction_InvalidInstanceNumberString(t *testing.T) {
	t.Parallel()
	// Test invalid instance number (not a valid integer)
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "d",
						location = "weu",
						name = "test",
						resource_type = "virtual_machine",
						instance_number = "abc"
					})
        }
        `,
				ExpectError: regexp.MustCompile(`The instance_number\s+must be a valid integer`),
			},
		},
	})
}

func TestResourceNameFunction_EmptyResourceName(t *testing.T) {
	t.Parallel()
	// Test empty resource name
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "d",
						location = "weu",
						name = "",
						resource_type = "virtual_machine",
						instance_number = "1"
					})
        }
        `,
				ExpectError: regexp.MustCompile(`Resource name cannot\s+be empty`),
			},
		},
	})
}

func TestResourceNameFunction_InvalidKey(t *testing.T) {
	t.Parallel()
	// Test invalid key in configuration
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						environment = "d",
						location = "weu",
						name = "test",
						resource_type = "virtual_machine",
						instance_number = "1",
						invalid_key = "should_not_be_here"
					})
        }
        `,
				ExpectError: regexp.MustCompile(`Invalid key in input\.\s+The key 'invalid_key' is not allowed`),
			},
		},
	})
}

func TestResourceNameFunction_InstanceNumberPadding(t *testing.T) {
	t.Parallel()
	// Test instance number padding with leading zeros
	testCases := []struct {
		instanceNumber string
		expected       string
	}{
		{"1", "dx-d-weu-test-vm-01"},
		{"9", "dx-d-weu-test-vm-09"},
		{"10", "dx-d-weu-test-vm-10"},
		{"99", "dx-d-weu-test-vm-99"},
	}

	for _, tc := range testCases {
		t.Run("instance_"+tc.instanceNumber, func(t *testing.T) {
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: `
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "d",
								location = "weu",
								name = "test",
								resource_type = "virtual_machine",
								instance_number = "` + tc.instanceNumber + `"
							})
            }
            `,
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}

func TestResourceNameFunction_DomainHandling(t *testing.T) {
	t.Parallel()
	// Test domain inclusion in resource name
	resource.UnitTest(t, resource.TestCase{
		TerraformVersionChecks: []tfversion.TerraformVersionCheck{
			tfversion.SkipBelow(tfversion.Version1_8_0),
		},
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
        output "test" {
          value = provider::dx::resource_name({
						prefix = "dx",
						domain = "payments",
						environment = "p",
						location = "italynorth",
						name = "processor",
						resource_type = "function_app",
						instance_number = "3"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-p-itn-payments-processor-func-03")),
				},
			},
		},
	})
}

func TestResourceNameFunction_CaseInsensitiveLocation(t *testing.T) {
	t.Parallel()
	// Test that location is case insensitive
	testCases := []struct {
		location string
		expected string
	}{
		{"WEU", "dx-d-weu-test-vm-01"},
		{"WeU", "dx-d-weu-test-vm-01"},
		{"WESTEUROPE", "dx-d-weu-test-vm-01"},
		{"WestEurope", "dx-d-weu-test-vm-01"},
		{"ITN", "dx-d-itn-test-vm-01"},
		{"ITALYNORTH", "dx-d-itn-test-vm-01"},
	}

	for _, tc := range testCases {
		t.Run("case_insensitive_"+tc.location, func(t *testing.T) {
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: `
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "d",
								location = "` + tc.location + `",
								name = "test",
								resource_type = "virtual_machine",
								instance_number = "1"
							})
            }
            `,
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}
