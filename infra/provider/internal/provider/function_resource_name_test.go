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
