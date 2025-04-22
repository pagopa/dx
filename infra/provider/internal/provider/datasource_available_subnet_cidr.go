// Implementation of the data source to find available CIDR blocks for subnets in Azure
package provider

import (
	"context"
	"fmt"
	"net"
	"regexp"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/network/armnetwork"
	"github.com/apparentlymart/go-cidr/cidr"
	"github.com/hashicorp/terraform-plugin-framework-validators/int64validator"
	"github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/datasource/schema"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
)

// Make sure it implements the DataSource interface
var _ datasource.DataSource = &availableSubnetCidrDataSource{}

func NewAvailableSubnetCidrDataSource() datasource.DataSource {
	return &availableSubnetCidrDataSource{}
}

// availableSubnetCidrDataSource defines the data source
type availableSubnetCidrDataSource struct {
}

// availableSubnetCidrDataSourceModel describes the data source data
type availableSubnetCidrDataSourceModel struct {
	VirtualNetworkID types.String `tfsdk:"virtual_network_id"`
	PrefixLength     types.Int64  `tfsdk:"prefix_length"`
	CidrBlock        types.String `tfsdk:"cidr_block"`
}

func (d *availableSubnetCidrDataSource) Metadata(ctx context.Context, req datasource.MetadataRequest, resp *datasource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_available_subnet_cidr"
}

func (d *availableSubnetCidrDataSource) Schema(ctx context.Context, req datasource.SchemaRequest, resp *datasource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.",

		Attributes: map[string]schema.Attribute{
			"virtual_network_id": schema.StringAttribute{
				Description: "The Azure Resource ID of the Virtual Network.",
				Required:    true,
				Validators: []validator.String{
					stringvalidator.RegexMatches(
						// Regex to match Azure VNet resource ID pattern
						// Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}
						regexp.MustCompile(`(?i)^/subscriptions/[^/]+/resourcegroups/[^/]+/providers/microsoft\.network/virtualnetworks/[^/]+$`),
						"must be a valid Azure VNet resource ID in the format /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}",
					),
				},
			},
			"prefix_length": schema.Int64Attribute{
				Description: "The desired prefix length for the new subnet CIDR (e.g., 24 for /24). Must be larger than the VNet prefix and smaller or equal to 29.",
				Required:    true,
				Validators: []validator.Int64{
					int64validator.Between(1, 29), // Azure subnet limits
				},
			},
			"cidr_block": schema.StringAttribute{
				Description: "The calculated available CIDR block.",
				Computed:    true,
			},
		},
	}
}

// Configure prepares the Azure client
func (d *availableSubnetCidrDataSource) Configure(ctx context.Context, req datasource.ConfigureRequest, resp *datasource.ConfigureResponse) {
}

// ValidateConfig validates the resource configuration
func (d *availableSubnetCidrDataSource) ValidateConfig(ctx context.Context, req datasource.ValidateConfigRequest, resp *datasource.ValidateConfigResponse) {
	var data availableSubnetCidrDataSourceModel

	resp.Diagnostics.Append(req.Config.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Virtual Network ID validation
	if !data.VirtualNetworkID.IsNull() && !data.VirtualNetworkID.IsUnknown() {
		vnetID := data.VirtualNetworkID.ValueString()
		_, err := parseVNetID(vnetID)
		if err != nil {
			resp.Diagnostics.AddAttributeError(
				path.Root("virtual_network_id"),
				"Invalid Virtual Network ID format",
				err.Error(),
			)
		}
	}

	// Prefix length validation is automatically handled by the int64validator.Between in Schema
}

func (d *availableSubnetCidrDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
	var data availableSubnetCidrDataSourceModel

	// Read Terraform configuration values into state
	resp.Diagnostics.Append(req.Config.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	tflog.Debug(ctx, "Starting Read for available_subnet_cidr", map[string]interface{}{
		"vnet_id":       data.VirtualNetworkID.ValueString(),
		"prefix_length": data.PrefixLength.ValueInt64(),
	})

	// --- Parsing VNet ID ---
	vnetID := data.VirtualNetworkID.ValueString()
	parsedID, err := parseVNetID(vnetID)
	if err != nil {
		resp.Diagnostics.AddError("Invalid Virtual Network ID", fmt.Sprintf("Cannot parse VNet ID '%s': %s", vnetID, err))
		return
	}

	// --- Setup Azure Client ---
	// Create an Azure client to interact with network resources
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		resp.Diagnostics.AddError("Azure Authentication Failed", fmt.Sprintf("Unable to create Azure credential: %s", err))
		return
	}

	// --- Get VNet Details ---
	// Get the details of the specified VNet
	vnetClient, err := armnetwork.NewVirtualNetworksClient(parsedID.subscriptionID, cred, nil)
	if err != nil {
		resp.Diagnostics.AddError("Azure Client Creation Failed", fmt.Sprintf("Unable to create Azure VirtualNetworks client: %s", err))
		return
	}

	vnetResp, err := vnetClient.Get(ctx, parsedID.resourceGroupName, parsedID.vnetName, nil)
	if err != nil {
		resp.Diagnostics.AddError("Azure API Error", fmt.Sprintf("Failed to get Virtual Network '%s': %s", parsedID.vnetName, err))
		return
	}

	// Verify that the VNet has at least one address space
	if vnetResp.Properties == nil || vnetResp.Properties.AddressSpace == nil || len(vnetResp.Properties.AddressSpace.AddressPrefixes) == 0 {
		resp.Diagnostics.AddError("VNet Configuration Error", fmt.Sprintf("Virtual Network '%s' has no address spaces defined.", parsedID.vnetName))
		return
	}

	// Get the VNet address spaces
	vnetAddressPrefixes := vnetResp.Properties.AddressSpace.AddressPrefixes

	// --- Get Existing Subnets ---
	// Get the existing subnets in the VNet
	subnetClient, err := armnetwork.NewSubnetsClient(parsedID.subscriptionID, cred, nil)
	if err != nil {
		resp.Diagnostics.AddError("Azure Client Creation Failed", fmt.Sprintf("Unable to create Azure Subnets client: %s", err))
		return
	}

	// Array to store the CIDRs of existing subnets
	existingSubnetCIDRs := []*net.IPNet{}

	// Use pager to iterate through all subnets
	pager := subnetClient.NewListPager(parsedID.resourceGroupName, parsedID.vnetName, nil)
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			resp.Diagnostics.AddError("Azure API Error", fmt.Sprintf("Failed to list subnets for VNet '%s': %s", parsedID.vnetName, err))
			return
		}

		// Process each subnet in the page
		for _, subnet := range page.Value {
			// Handle the case of a single address prefix
			if subnet.Properties != nil && subnet.Properties.AddressPrefix != nil {
				_, ipnet, err := net.ParseCIDR(*subnet.Properties.AddressPrefix)
				if err != nil {
					tflog.Warn(ctx, "Could not parse existing subnet CIDR", map[string]interface{}{"cidr": *subnet.Properties.AddressPrefix, "error": err.Error()})
					continue // Ignore invalid CIDRs
				}
				existingSubnetCIDRs = append(existingSubnetCIDRs, ipnet)
			}

			// Handle the case of multiple address prefixes
			if subnet.Properties != nil && subnet.Properties.AddressPrefixes != nil && len(subnet.Properties.AddressPrefixes) > 0 {
				for _, prefix := range subnet.Properties.AddressPrefixes {
					_, ipnet, err := net.ParseCIDR(*prefix)
					if err != nil {
						tflog.Warn(ctx, "Could not parse existing subnet CIDR from list", map[string]interface{}{"cidr": *prefix, "error": err.Error()})
						continue
					}
					existingSubnetCIDRs = append(existingSubnetCIDRs, ipnet)
				}
			}
		}
	}

	// --- Find Available CIDR ---
	// Set the desired prefix length
	desiredPrefixLen := int(data.PrefixLength.ValueInt64())
	foundCidr := ""

	// Iterate through the VNet address spaces
	for _, vnetPrefixPtr := range vnetAddressPrefixes {
		vnetPrefix := *vnetPrefixPtr
		_, vnetNet, err := net.ParseCIDR(vnetPrefix)
		if err != nil {
			tflog.Warn(ctx, "Could not parse VNet address prefix", map[string]interface{}{"cidr": vnetPrefix, "error": err})
			continue
		}

		// Verify that the subnet prefix length is greater than the VNet's
		vnetPrefixLen, _ := vnetNet.Mask.Size()
		if desiredPrefixLen <= vnetPrefixLen {
			tflog.Warn(ctx, "Desired prefix length too small", map[string]interface{}{
				"desired_length": desiredPrefixLen,
				"vnet_length":    vnetPrefixLen,
				"vnet_prefix":    vnetPrefix,
			})
			continue // Try with the next VNet address space
		}

		// Calculate the number of possible subnets in the VNet space
		// This is 2^(desiredPrefixLen - vnetPrefixLen)
		subnetCount := 1 << uint(desiredPrefixLen-vnetPrefixLen)
		tflog.Debug(ctx, "Possible subnet count in VNet space", map[string]interface{}{
			"vnet_prefix":    vnetPrefix,
			"vnet_length":    vnetPrefixLen,
			"desired_length": desiredPrefixLen,
			"subnet_count":   subnetCount,
		})

		// Iterate through all possible subnets in the VNet space
		// and check if they overlap with existing subnets
		for i := 0; i < subnetCount; i++ {
			// Calculate the address of the candidate subnet
			candidateNet, err := cidr.Subnet(vnetNet, desiredPrefixLen-vnetPrefixLen, i)
			if err != nil {
				tflog.Warn(ctx, "Error calculating subnet CIDR", map[string]interface{}{"error": err.Error()})
				continue
			}

			// Check for overlaps with existing subnets
			overlaps := false
			for _, existingNet := range existingSubnetCIDRs {
				if cidrOverlaps(candidateNet, existingNet) {
					overlaps = true
					break
				}
			}

			if !overlaps {
				// Found an available CIDR!
				foundCidr = candidateNet.String()
				tflog.Info(ctx, "Found available CIDR", map[string]interface{}{"cidr": foundCidr})
				break // Exit the candidate subnet loop
			}
		}

		if foundCidr != "" {
			break // Exit the VNet spaces loop if we found a CIDR
		}
	}

	// Check if an available CIDR was found
	if foundCidr == "" {
		resp.Diagnostics.AddError("CIDR Calculation Failed", fmt.Sprintf("Could not find an available /%d CIDR block in VNet %s", desiredPrefixLen, vnetID))
		return
	}

	data.CidrBlock = types.StringValue(foundCidr)

	// Save the data in Terraform state
	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
	tflog.Debug(ctx, "Finished Read for available_subnet_cidr", map[string]interface{}{"found_cidr": foundCidr})
}

// --- Helper functions ---

// parseVNetID extracts the relevant parts from an Azure VNet ID
type parsedVNetID struct {
	subscriptionID    string
	resourceGroupName string
	vnetName          string
}

func parseVNetID(id string) (*parsedVNetID, error) {
	// Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}
	parts := strings.Split(strings.ToLower(id), "/")

	// Verify that the ID has the correct format
	if len(parts) != 9 || parts[0] != "" || parts[1] != "subscriptions" || parts[3] != "resourcegroups" ||
		parts[5] != "providers" || parts[6] != "microsoft.network" || parts[7] != "virtualnetworks" {
		return nil, fmt.Errorf("invalid VNet ID format. Expected '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}'")
	}

	return &parsedVNetID{
		subscriptionID:    parts[2],
		resourceGroupName: parts[4],
		vnetName:          parts[8],
	}, nil
}

// cidrOverlaps checks if two CIDRs overlap
func cidrOverlaps(a, b *net.IPNet) bool {
	return a.Contains(b.IP) || b.Contains(a.IP)
}
