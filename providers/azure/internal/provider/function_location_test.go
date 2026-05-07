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

// --- convert_location_to_long_format ---

func TestConvertLocationToLongFormatFunction(t *testing.T) {
	t.Parallel()

	cases := []struct {
		input    string
		expected string
	}{
		{"itn", "italynorth"},
		{"weu", "westeurope"},
		{"neu", "northeurope"},
		{"swc", "swedencentral"},
		{"spc", "spaincentral"},
		{"gwc", "germanycentral"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
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
  value = provider::dx::convert_location_to_long_format(%q)
}
`, tc.input),
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}

func TestConvertLocationToLongFormatFunction_Invalid(t *testing.T) {
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
  value = provider::dx::convert_location_to_long_format("unk")
}
`,
				ExpectError: regexp.MustCompile(`InvalidLocation`),
			},
		},
	})
}

// --- convert_location_to_short_format ---

func TestConvertLocationToShortFormatFunction(t *testing.T) {
	t.Parallel()

	cases := []struct {
		input    string
		expected string
	}{
		{"italynorth", "itn"},
		{"westeurope", "weu"},
		{"northeurope", "neu"},
		{"swedencentral", "swc"},
		{"spaincentral", "spc"},
		{"germanycentral", "gwc"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
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
  value = provider::dx::convert_location_to_short_format(%q)
}
`, tc.input),
						ConfigStateChecks: []statecheck.StateCheck{
							statecheck.ExpectKnownOutputValue("test", knownvalue.StringExact(tc.expected)),
						},
					},
				},
			})
		})
	}
}

func TestConvertLocationToShortFormatFunction_Invalid(t *testing.T) {
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
  value = provider::dx::convert_location_to_short_format("eastus")
}
`,
				ExpectError: regexp.MustCompile(`InvalidLocation`),
			},
		},
	})
}
