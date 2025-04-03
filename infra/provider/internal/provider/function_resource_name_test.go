package provider

import (
	"regexp"
	"testing"

	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
	"github.com/hashicorp/terraform-plugin-testing/tfversion"
)

func TestComputeResourceNameFunction_Known(t *testing.T) {
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
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckOutput("test", "dx-d-itn-test-example-snet-01"),
				),
			},
		},
	})
}

func TestComputeResourceNameFunction_Null(t *testing.T) {
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
						location = "usa",
						name = "example",
						resource_type = "null_resource",
						instance_number = 100
					})
        }
        `,
				ExpectError: regexp.MustCompile(""),
			},
		},
	})
}
