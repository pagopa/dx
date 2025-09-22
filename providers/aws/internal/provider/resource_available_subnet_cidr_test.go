// Package provider provides tests for the AWS available subnet CIDR resource
package provider

import (
	"testing"

	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAvailableSubnetCidrResource_Basic(t *testing.T) {
	t.Skip("This test requires actual AWS credentials and a VPC to test against")

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
		Steps: []resource.TestStep{
			{
				Config: `
					provider "dx" {}

					data "aws_vpc" "test" {
						default = true
					}

					resource "dx_available_subnet_cidr" "test" {
						vpc_id        = data.aws_vpc.test.id
						prefix_length = 24
					}
				`,
				Check: resource.ComposeTestCheckFunc(
					resource.TestCheckResourceAttrSet("dx_available_subnet_cidr.test", "id"),
					resource.TestCheckResourceAttrSet("dx_available_subnet_cidr.test", "cidr_block"),
					resource.TestCheckResourceAttr("dx_available_subnet_cidr.test", "prefix_length", "24"),
				),
			},
		},
	})
}
