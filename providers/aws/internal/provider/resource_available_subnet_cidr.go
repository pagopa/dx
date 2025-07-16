// Implementation of the resource to allocate an available CIDR block for subnets in AWS VPC
package provider

import (
	"context"
	"fmt"
	"net"
	"regexp"

	"github.com/apparentlymart/go-cidr/cidr"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/hashicorp/terraform-plugin-framework-validators/int64validator"
	"github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
	frameworkTypes "github.com/hashicorp/terraform-plugin-framework/types"
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
	ID           frameworkTypes.String `tfsdk:"id"`
	VpcID        frameworkTypes.String `tfsdk:"vpc_id"`
	PrefixLength frameworkTypes.Int64  `tfsdk:"prefix_length"`
	CidrBlock    frameworkTypes.String `tfsdk:"cidr_block"`
}

func (r *availableSubnetCidrResource) Metadata(ctx context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_available_subnet_cidr"
}

func (r *availableSubnetCidrResource) Schema(ctx context.Context, req resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Allocates and reserves an available CIDR block for a new subnet within a specified AWS VPC.",

		Attributes: map[string]schema.Attribute{
			"id": schema.StringAttribute{
				Description: "Resource identifier",
				Computed:    true,
			},
			"vpc_id": schema.StringAttribute{
				Description: "The AWS VPC ID where the subnet will be created.",
				Required:    true,
				Validators: []validator.String{
					stringvalidator.RegexMatches(
						// Regex to match AWS VPC ID pattern
						// Format: vpc-xxxxxxxxx
						regexp.MustCompile(`^vpc-[a-zA-Z0-9]+$`),
						"must be a valid AWS VPC ID in the format vpc-xxxxxxxxx",
					),
				},
				// Prevent changes to vpc_id after creation
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.RequiresReplace(),
				},
			},
			"prefix_length": schema.Int64Attribute{
				Description: "The desired prefix length for the new subnet CIDR (e.g., 24 for /24). Must be larger than the VPC prefix and smaller or equal to 28.",
				Required:    true,
				Validators: []validator.Int64{
					int64validator.Between(1, 28), // AWS subnet limits
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

// Configure prepares the AWS client
func (r *availableSubnetCidrResource) Configure(ctx context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
}

func (r *availableSubnetCidrResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan availableSubnetCidrResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Create AWS config
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		resp.Diagnostics.AddError(
			"AWS Configuration Error",
			"Unable to load AWS configuration: "+err.Error(),
		)
		return
	}

	// Create EC2 client
	ec2Client := ec2.NewFromConfig(cfg)

	// Get VPC information
	vpcID := plan.VpcID.ValueString()
	prefixLength := int(plan.PrefixLength.ValueInt64())

	tflog.Debug(ctx, "Looking for available CIDR in VPC", map[string]interface{}{
		"vpc_id":        vpcID,
		"prefix_length": prefixLength,
	})

	// Describe the VPC to get its CIDR blocks
	vpcResult, err := ec2Client.DescribeVpcs(ctx, &ec2.DescribeVpcsInput{
		VpcIds: []string{vpcID},
	})
	if err != nil {
		resp.Diagnostics.AddError(
			"AWS API Error",
			"Unable to describe VPC: "+err.Error(),
		)
		return
	}

	if len(vpcResult.Vpcs) == 0 {
		resp.Diagnostics.AddError(
			"VPC Not Found",
			fmt.Sprintf("VPC with ID %s not found", vpcID),
		)
		return
	}

	vpc := vpcResult.Vpcs[0]
	if len(vpc.CidrBlockAssociationSet) == 0 {
		resp.Diagnostics.AddError(
			"VPC CIDR Error",
			"VPC has no CIDR blocks associated",
		)
		return
	}

	// Get existing subnets
	subnetsResult, err := ec2Client.DescribeSubnets(ctx, &ec2.DescribeSubnetsInput{
		Filters: []types.Filter{
			{
				Name:   &[]string{"vpc-id"}[0],
				Values: []string{vpcID},
			},
		},
	})
	if err != nil {
		resp.Diagnostics.AddError(
			"AWS API Error",
			"Unable to describe subnets: "+err.Error(),
		)
	}

	// Collect existing CIDR blocks
	var existingCIDRs []string
	for _, subnet := range subnetsResult.Subnets {
		if subnet.CidrBlock != nil {
			existingCIDRs = append(existingCIDRs, *subnet.CidrBlock)
		}
	}

	// Find available CIDR
	var availableCIDR string
	for _, cidrAssoc := range vpc.CidrBlockAssociationSet {
		if cidrAssoc.CidrBlock == nil {
			continue
		}

		vpcCIDR := *cidrAssoc.CidrBlock
		tflog.Debug(ctx, "Checking VPC CIDR", map[string]interface{}{
			"vpc_cidr": vpcCIDR,
		})

		// Parse VPC CIDR
		_, vpcNet, err := net.ParseCIDR(vpcCIDR)
		if err != nil {
			continue
		}

		// Generate subnets for the desired prefix length
		newPrefixLength := prefixLength
		currentPrefixLength := getNetworkPrefixLength(vpcNet)

		if newPrefixLength <= currentPrefixLength {
			resp.Diagnostics.AddError(
				"Invalid Prefix Length",
				fmt.Sprintf("Prefix length %d must be greater than VPC prefix length %d", newPrefixLength, currentPrefixLength),
			)
			return
		}

		// Calculate how many subnets we can create
		subnetBits := newPrefixLength - currentPrefixLength
		numSubnets := 1 << subnetBits

		// Check each potential subnet
		for i := 0; i < numSubnets; i++ {
			subnetNet, err := cidr.Subnet(vpcNet, subnetBits, i)
			if err != nil {
				continue
			}

			subnetCIDR := subnetNet.String()

			// Check if this CIDR is already in use
			isAvailable := true
			for _, existingCIDR := range existingCIDRs {
				if cidrOverlaps(subnetCIDR, existingCIDR) {
					isAvailable = false
					break
				}
			}

			if isAvailable {
				availableCIDR = subnetCIDR
				break
			}
		}

		if availableCIDR != "" {
			break
		}
	}

	if availableCIDR == "" {
		resp.Diagnostics.AddError(
			"No Available CIDR",
			fmt.Sprintf("No available CIDR block found in VPC %s with prefix length /%d", vpcID, prefixLength),
		)
		return
	}

	// Set the result
	plan.ID = frameworkTypes.StringValue(fmt.Sprintf("%s/%d", vpcID, prefixLength))
	plan.CidrBlock = frameworkTypes.StringValue(availableCIDR)

	tflog.Debug(ctx, "Found available CIDR", map[string]interface{}{
		"cidr_block": availableCIDR,
	})

	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *availableSubnetCidrResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state availableSubnetCidrResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *availableSubnetCidrResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	resp.Diagnostics.AddError(
		"Update Not Supported",
		"Updating available_subnet_cidr resource is not supported",
	)
}

func (r *availableSubnetCidrResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	// Nothing to delete - this resource just calculates available CIDRs
}

// Helper functions

func getNetworkPrefixLength(network *net.IPNet) int {
	ones, _ := network.Mask.Size()
	return ones
}

func cidrOverlaps(cidr1, cidr2 string) bool {
	_, net1, err1 := net.ParseCIDR(cidr1)
	_, net2, err2 := net.ParseCIDR(cidr2)

	if err1 != nil || err2 != nil {
		return false
	}

	return net1.Contains(net2.IP) || net2.Contains(net1.IP)
}

// Custom plan modifier for prefix length
func prefixLengthRequiresReplace() planmodifier.Int64 {
	return &prefixLengthRequiresReplaceModifier{}
}

type prefixLengthRequiresReplaceModifier struct{}

func (m *prefixLengthRequiresReplaceModifier) Description(ctx context.Context) string {
	return "If the value of this attribute changes, Terraform will destroy and recreate the resource."
}

func (m *prefixLengthRequiresReplaceModifier) MarkdownDescription(ctx context.Context) string {
	return "If the value of this attribute changes, Terraform will destroy and recreate the resource."
}

func (m *prefixLengthRequiresReplaceModifier) PlanModifyInt64(ctx context.Context, req planmodifier.Int64Request, resp *planmodifier.Int64Response) {
	if req.State.Raw.IsNull() {
		return
	}

	if req.ConfigValue.IsUnknown() || req.PlanValue.IsUnknown() {
		return
	}

	if req.StateValue.Equal(req.PlanValue) {
		return
	}

	resp.RequiresReplace = true
}
