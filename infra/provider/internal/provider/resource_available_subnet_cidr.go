// Implementation of the resource to allocate an available CIDR block for subnets in Azure
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
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
)

// Make sure it implements the Resource interface
var _ resource.Resource = &availableSubnetCidrResource{}

func NewAvailableSubnetCidrResource() resource.Resource {
	return &availableSubnetCidrResource{}
}

// Resource definition
type availableSubnetCidrResource struct {
}

// Resource model
type availableSubnetCidrResourceModel struct {
	ID               types.String `tfsdk:"id"`
	VirtualNetworkID types.String `tfsdk:"virtual_network_id"`
	PrefixLength     types.Int64  `tfsdk:"prefix_length"`
	CidrBlock        types.String `tfsdk:"cidr_block"`
}

func (r *availableSubnetCidrResource) Metadata(ctx context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_available_subnet_cidr"
}

func (r *availableSubnetCidrResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Allocates and reserves an available CIDR block for a new subnet within a specified Azure Virtual Network.",

		Attributes: map[string]schema.Attribute{
			"id": schema.StringAttribute{
				Description: "Resource identifier",
				Computed:    true,
			},
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
				// Prevent changes to virtual_network_id after creation
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.RequiresReplace(),
				},
			},
			"prefix_length": schema.Int64Attribute{
				Description: "The desired prefix length for the new subnet CIDR (e.g., 24 for /24). Must be larger than the VNet prefix and smaller or equal to 29.",
				Required:    true,
				Validators: []validator.Int64{
					int64validator.Between(1, 29), // Azure subnet limits
				},
				// Prevent changes to prefix_length after creation
				PlanModifiers: []planmodifier.Int64{
					prefixLengthRequiresReplace(),
				},
			},
			"cidr_block": schema.StringAttribute{
				Description: "The allocated available CIDR block.",
				Computed:    true,
				// Prevent changes to CIDR block after it's allocated
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.UseStateForUnknown(),
				},
			},
		},
	}
}

// Configure prepares the Azure client
func (r *availableSubnetCidrResource) Configure(ctx context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
}

// ValidateConfig validates the resource configuration
func (r *availableSubnetCidrResource) ValidateConfig(ctx context.Context, req resource.ValidateConfigRequest, resp *resource.ValidateConfigResponse) {
	var data availableSubnetCidrResourceModel

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

	// Note: It is not possible to verify if prefix_length is modified here
	// because ValidateConfigRequest does not have access to the state.
	// Instead, we use RequiresReplace in the planmodifier.
}

// Create allocates a new CIDR block from the available pool
func (r *availableSubnetCidrResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var data availableSubnetCidrResourceModel

	// Read Terraform plan data into the model
	resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Find an available CIDR block
	cidrBlock, diags := findAvailableCidrBlock(ctx, data.VirtualNetworkID.ValueString(), int(data.PrefixLength.ValueInt64()))
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Set the CIDR block and resource ID
	data.CidrBlock = types.StringValue(cidrBlock)

	// Generate a unique ID for the resource
	// Format: {virtualNetworkId}_{prefixLength}_{cidrBlock}
	resourceID := fmt.Sprintf("%s_%d_%s",
		strings.ReplaceAll(data.VirtualNetworkID.ValueString(), "/", "_"),
		data.PrefixLength.ValueInt64(),
		strings.ReplaceAll(cidrBlock, "/", "_"))
	data.ID = types.StringValue(resourceID)

	// Save data into Terraform state
	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
	tflog.Info(ctx, "Created available subnet CIDR resource", map[string]interface{}{
		"virtual_network_id": data.VirtualNetworkID.ValueString(),
		"prefix_length":      data.PrefixLength.ValueInt64(),
		"cidr_block":         cidrBlock,
	})
}

// Read refreshes the Terraform state with the latest data
func (r *availableSubnetCidrResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var data availableSubnetCidrResourceModel

	// Read Terraform prior state into the model
	resp.Diagnostics.Append(req.State.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// This is a virtual resource, so we don't need to read anything from Azure.
	// The resource represents a reserved CIDR block, which is tracked only in Terraform state.
	// We simply keep the existing values.

	// Save updated data into Terraform state
	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
}

// Update updates the resource
func (r *availableSubnetCidrResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var data availableSubnetCidrResourceModel

	// Read Terraform plan data into the model
	resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// This resource is designed to be immutable - any change to key fields requires recreation.
	// Due to our schema configuration with RequiresReplace, this method should rarely be called.
	// If it is called, we simply maintain the state as is.

	// Save updated data into Terraform state
	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
}

// Delete deletes the resource
func (r *availableSubnetCidrResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	// This is a virtual resource, nothing to actually delete in Azure
	// Just write a log message and return without attempting to read the state
	tflog.Info(ctx, "Deleting available subnet CIDR resource")
}

// PlanModifiers implements the plan modifiers for this resource
func (r *availableSubnetCidrResource) ModifyPlan(ctx context.Context, req resource.ModifyPlanRequest, resp *resource.ModifyPlanResponse) {
	// In the creation phase, we don't modify the plan
	// Leave the cidr_block attribute as "known after apply"
	// This prevents inconsistency errors during apply
	tflog.Info(ctx, "CIDR value will be calculated during apply")
}

// Helper function to find an available CIDR block
// This reuses most of the data source logic but returns diagnostics
func findAvailableCidrBlock(ctx context.Context, vnetID string, prefixLength int) (string, diag.Diagnostics) {
	var diagnostics diag.Diagnostics

	// --- Parsing VNet ID ---
	parsedID, err := parseVNetID(vnetID)
	if err != nil {
		diagnostics.AddError(
			"Invalid Virtual Network ID",
			fmt.Sprintf("Cannot parse VNet ID '%s': %s", vnetID, err),
		)
		return "", diagnostics
	}

	// --- Setup Azure Client ---
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		diagnostics.AddError(
			"Azure Authentication Failed",
			fmt.Sprintf("Unable to create Azure credential: %s", err),
		)
		return "", diagnostics
	}

	// --- Get VNet Details ---
	vnetClient, err := armnetwork.NewVirtualNetworksClient(parsedID.subscriptionID, cred, nil)
	if err != nil {
		diagnostics.AddError(
			"Azure Client Creation Failed",
			fmt.Sprintf("Unable to create Azure VirtualNetworks client: %s", err),
		)
		return "", diagnostics
	}

	vnetResp, err := vnetClient.Get(ctx, parsedID.resourceGroupName, parsedID.vnetName, nil)
	if err != nil {
		diagnostics.AddError(
			"Azure API Error",
			fmt.Sprintf("Failed to get Virtual Network '%s': %s", parsedID.vnetName, err),
		)
		return "", diagnostics
	}

	if vnetResp.Properties == nil || vnetResp.Properties.AddressSpace == nil || len(vnetResp.Properties.AddressSpace.AddressPrefixes) == 0 {
		diagnostics.AddError(
			"VNet Configuration Error",
			fmt.Sprintf("Virtual Network '%s' has no address spaces defined.", parsedID.vnetName),
		)
		return "", diagnostics
	}

	vnetAddressPrefixes := vnetResp.Properties.AddressSpace.AddressPrefixes

	// --- Get Existing Subnets ---
	subnetClient, err := armnetwork.NewSubnetsClient(parsedID.subscriptionID, cred, nil)
	if err != nil {
		diagnostics.AddError(
			"Azure Client Creation Failed",
			fmt.Sprintf("Unable to create Azure Subnets client: %s", err),
		)
		return "", diagnostics
	}

	existingSubnetCIDRs := []*net.IPNet{}

	pager := subnetClient.NewListPager(parsedID.resourceGroupName, parsedID.vnetName, nil)
	for pager.More() {
		page, err := pager.NextPage(ctx)
		if err != nil {
			diagnostics.AddError(
				"Azure API Error",
				fmt.Sprintf("Failed to list subnets for VNet '%s': %s", parsedID.vnetName, err),
			)
			return "", diagnostics
		}

		for _, subnet := range page.Value {
			if subnet.Properties != nil && subnet.Properties.AddressPrefix != nil {
				_, ipnet, err := net.ParseCIDR(*subnet.Properties.AddressPrefix)
				if err != nil {
					tflog.Warn(ctx, "Could not parse existing subnet CIDR", map[string]interface{}{"cidr": *subnet.Properties.AddressPrefix, "error": err.Error()})
					continue
				}
				existingSubnetCIDRs = append(existingSubnetCIDRs, ipnet)
			}

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
	desiredPrefixLen := prefixLength
	foundCidr := ""

	for _, vnetPrefixPtr := range vnetAddressPrefixes {
		vnetPrefix := *vnetPrefixPtr
		_, vnetNet, err := net.ParseCIDR(vnetPrefix)
		if err != nil {
			tflog.Warn(ctx, "Could not parse VNet address prefix", map[string]interface{}{"cidr": vnetPrefix, "error": err})
			continue
		}

		vnetPrefixLen, _ := vnetNet.Mask.Size()
		if desiredPrefixLen <= vnetPrefixLen {
			tflog.Warn(ctx, "Desired prefix length too small", map[string]interface{}{
				"desired_length": desiredPrefixLen,
				"vnet_length":    vnetPrefixLen,
				"vnet_prefix":    vnetPrefix,
			})
			continue
		}

		subnetCount := 1 << uint(desiredPrefixLen-vnetPrefixLen)
		tflog.Debug(ctx, "Possible subnet count in VNet space", map[string]interface{}{
			"vnet_prefix":    vnetPrefix,
			"vnet_length":    vnetPrefixLen,
			"desired_length": desiredPrefixLen,
			"subnet_count":   subnetCount,
		})

		for i := 0; i < subnetCount; i++ {
			candidateNet, err := cidr.Subnet(vnetNet, desiredPrefixLen-vnetPrefixLen, i)
			if err != nil {
				tflog.Warn(ctx, "Error calculating subnet CIDR", map[string]interface{}{"error": err.Error()})
				continue
			}

			overlaps := false
			for _, existingNet := range existingSubnetCIDRs {
				if cidrOverlaps(candidateNet, existingNet) {
					overlaps = true
					break
				}
			}

			if !overlaps {
				foundCidr = candidateNet.String()
				tflog.Info(ctx, "Found available CIDR", map[string]interface{}{"cidr": foundCidr})
				break
			}
		}

		if foundCidr != "" {
			break
		}
	}

	if foundCidr == "" {
		diagnostics.AddError(
			"CIDR Calculation Failed",
			fmt.Sprintf("Could not find an available /%d CIDR block in VNet %s", desiredPrefixLen, vnetID),
		)
		return "", diagnostics
	}

	return foundCidr, diagnostics
}

// prefixLengthRequiresReplace is a plan modifier that requires recreating the resource
// if the prefix length is modified
func prefixLengthRequiresReplace() planmodifier.Int64 {
	return &prefixLengthRequiresReplaceModifier{}
}

type prefixLengthRequiresReplaceModifier struct{}

// Description returns a description of the plan modifier
func (m *prefixLengthRequiresReplaceModifier) Description(ctx context.Context) string {
	return "Requires recreation of the resource if the prefix length is modified."
}

// MarkdownDescription returns a markdown description of the plan modifier
func (m *prefixLengthRequiresReplaceModifier) MarkdownDescription(ctx context.Context) string {
	return "Requires recreation of the resource if the prefix length is modified."
}

// PlanModifyInt64 implements the plan modifier logic
func (m *prefixLengthRequiresReplaceModifier) PlanModifyInt64(ctx context.Context, req planmodifier.Int64Request, resp *planmodifier.Int64Response) {
	// If we don't have a previous state value, there's nothing to do
	if req.StateValue.IsNull() {
		return
	}

	// If the planned value is the same as the state value, there's nothing to do
	if req.PlanValue.Equal(req.StateValue) {
		return
	}

	// If we get here, the value has changed and we require recreation of the resource
	resp.RequiresReplace = true
}
