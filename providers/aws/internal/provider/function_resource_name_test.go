// Package provider provides tests for the AWS resource naming function
package provider

import (
	"fmt"
	"regexp"
	"testing"

	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
	"github.com/hashicorp/terraform-plugin-testing/knownvalue"
	"github.com/hashicorp/terraform-plugin-testing/statecheck"
	"github.com/hashicorp/terraform-plugin-testing/tfversion"
)

func TestResourceNameFunction_Known(t *testing.T) {
	t.Parallel()
	// Test basic resource name generation
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
						region = "eu",
						name = "example",
						resource_type = "s3_bucket",
						instance_number = "1"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-d-eu-example-s3-01")),
				},
			},
		},
	})
}

func TestResourceNameFunction_InvalidRegion(t *testing.T) {
	t.Parallel()
	// Test invalid region error
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
						region = "invalid-region",
						name = "example",
						resource_type = "s3_bucket",
						instance_number = "1"
					})
        }
        `,
				ExpectError: regexp.MustCompile("InvalidRegion"),
			},
		},
	})
}

func TestResourceNameFunction_InvalidInstanceNumber(t *testing.T) {
	t.Parallel()
	// Test invalid instance number error
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
						region = "eu",
						name = "example",
						resource_type = "s3_bucket",
						instance_number = "100"
					})
        }
        `,
				ExpectError: regexp.MustCompile("InvalidInstance"),
			},
		},
	})
}

func TestResourceNameFunction_InvalidResourceType(t *testing.T) {
	t.Parallel()
	// Test invalid resource type error
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
						region = "eu",
						name = "example",
						resource_type = "invalid_resource",
						instance_number = "1"
					})
        }
        `,
				ExpectError: regexp.MustCompile("InvalidResourceType"),
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
						region = "euc1",
						name = "example",
						resource_type = "lambda_function",
						instance_number = "1"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-d-euc1-example-lambda-01")),
				},
			},
		},
	})
}

func TestResourceNameFunction_S3BucketSpecialHandling(t *testing.T) {
	t.Parallel()
	// Test to verify S3 bucket naming handles underscores
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
						region = "euw3",
						name = "data-store",
						resource_type = "s3_bucket",
						instance_number = "5"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-p-euw3-data-store-s3-05")),
				},
			},
		},
	})
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
						region = "eus1",
						name = "processor",
						resource_type = "lambda_function",
						instance_number = "3"
					})
        }
        `,
				ConfigStateChecks: []statecheck.StateCheck{
					statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact("dx-p-eus1-payments-processor-lambda-03")),
				},
			},
		},
	})
}

func TestResourceNameFunction_AllRegions(t *testing.T) {
	testCases := []struct {
		name     string
		region   string
		expected string
	}{
		{"EU West 1", "eu", "dx-d-eu-test-ec2-01"},
		{"EU West 1 Full", "eu-west-1", "dx-d-eu-test-ec2-01"},
		{"EU Central 1", "euc1", "dx-d-euc1-test-ec2-01"},
		{"EU Central 1 Full", "eu-central-1", "dx-d-euc1-test-ec2-01"},
		{"EU West 3", "euw3", "dx-d-euw3-test-ec2-01"},
		{"EU West 3 Full", "eu-west-3", "dx-d-euw3-test-ec2-01"},
		{"EU North 1", "eun1", "dx-d-eun1-test-ec2-01"},
		{"EU North 1 Full", "eu-north-1", "dx-d-eun1-test-ec2-01"},
		{"EU South 1", "eus1", "dx-d-eus1-test-ec2-01"},
		{"EU South 1 Full", "eu-south-1", "dx-d-eus1-test-ec2-01"},
	}

	for _, tc := range testCases {
		tc := tc // capture range variable
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			resource.UnitTest(t, resource.TestCase{
				TerraformVersionChecks: []tfversion.TerraformVersionCheck{
					tfversion.SkipBelow(tfversion.Version1_8_0),
				},
				ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
				Steps: []resource.TestStep{
					{
						Config: fmt.Sprintf(`
            output "test" {
              value = provider::dx::resource_name({
								prefix = "dx",
								environment = "d",
								region = "%s",
								name = "test",
								resource_type = "ec2_instance",
								instance_number = "1"
							})
            }
            `, tc.region),
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}
