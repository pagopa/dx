# Complete AWS-Azure VPN Example

This example demonstrates a comprehensive AWS-Azure VPN setup using the `aws_azure_vpn` module with high availability configuration.

## What This Example Creates

### AWS Resources
- **VPC**: A new VPC with CIDR `10.1.0.0/16`
- **Private Subnets**: Two private subnets across different availability zones
- **Route Table**: Configured to route Azure traffic through the VPN gateway (**Required in AWS**)
- **VPN Gateway**: AWS VPN gateway attached to the VPC
- **Customer Gateways**: Representing Azure VPN gateway endpoints
- **VPN Connections**: Two VPN connections for high availability

### Azure Resources
- **Resource Group**: Container for all Azure resources
- **Virtual Network**: VNet with CIDR `10.2.0.0/16`
- **Gateway Subnet**: Dedicated subnet for the VPN gateway (`GatewaySubnet`)
- **Workload Subnet**: Regular subnet for application workloads
- **VPN Gateway**: Azure Virtual Network Gateway for site-to-site VPN (BGP enabled)
- **Public IPs**: Static public IP addresses for the VPN gateway
- **Local Network Gateways**: Representing AWS VPN endpoints
- **VPN Connections**: Site-to-site connections between Azure and AWS
- **Routing**: Automatically handled by BGP (no manual route tables needed)

## Architecture

```
AWS VPC (10.1.0.0/16)                    Azure VNet (10.2.0.0/16)
┌─────────────────────────────┐          ┌─────────────────────────────┐
│                             │          │                             │
│  ┌─────────────────────┐    │          │    ┌─────────────────────┐  │
│  │ Private Subnet 1    │    │          │    │ Gateway Subnet      │  │
│  │ 10.1.1.0/24         │    │          │    │ 10.2.255.0/27       │  │
│  └─────────────────────┘    │    HA    │    └─────────────────────┘  │
│                             │   VPN    │                             │
│  ┌─────────────────────┐    │ ◄──────► │    ┌─────────────────────┐  │
│  │ Private Subnet 2    │    │          │    │ Workload Subnet     │  │
│  │ 10.1.2.0/24         │    │          │    │ 10.2.1.0/24         │  │
│  └─────────────────────┘    │          │    └─────────────────────┘  │
│                             │          │                             │
└─────────────────────────────┘          └─────────────────────────────┘
```

## Configuration Highlights

- **High Availability**: Uses the `high_availability` use case for redundant VPN connections
- **AWS Routing**: Module automatically creates required routes in AWS route tables
- **Azure BGP**: Automatic route propagation handles Azure-side routing
- **Dual Tunnels**: Each VPN connection provides two tunnels for redundancy
- **Resource Naming**: Follows DX naming conventions for all resources

## Usage

1. **Initialize Terraform**:
   ```bash
   terraform init
   ```

2. **Plan the deployment**:
   ```bash
   terraform plan
   ```

3. **Apply the configuration**:
   ```bash
   terraform apply
   ```

4. **Verify connectivity** (after deployment):
   - Check VPN connection status in AWS Console
   - Verify VPN gateway status in Azure Portal
   - Test network connectivity between resources

## Testing Connectivity

After deployment, you can test the VPN connection by:

1. Creating test instances in both AWS private subnets and Azure workload subnet
2. Attempting to ping/connect between instances using private IP addresses
3. Monitoring VPN tunnel status in both AWS and Azure consoles

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Cost Considerations

This example creates billable resources in both AWS and Azure:

- AWS VPN Gateway (hourly charge)
- Azure Virtual Network Gateway (hourly charge)  
- Data transfer charges for cross-cloud traffic
- Public IP addresses in Azure

Estimated monthly cost: ~$200-300 USD for the VPN gateways alone.

## Variables

All configuration is defined in `locals.tf`. You can modify:

- `aws_region`: AWS region for deployment
- `azure_location`: Azure region for deployment  
- `environment`: Environment configuration for resource naming
- CIDR blocks for AWS VPC and Azure VNet

## Security Notes

- All VPN traffic is encrypted using IPsec
- BGP ASNs are configured automatically by the module
- No internet gateways are created for the private subnets
- Route tables ensure traffic flows through VPN gateways only

## Key Differences: AWS vs Azure VPN Routing

### AWS Routing (Required) 🔴
- **Manual routes mandatory**: AWS VPN gateways do NOT automatically propagate routes
- **Route tables must be updated**: You must add routes pointing to VPN gateway
- **No auto-discovery**: Static configuration required for cross-cloud traffic

### Azure Routing (Automatic) 🟢  
- **BGP auto-propagation**: Azure VPN gateway automatically learns and propagates AWS routes
- **Dynamic updates**: Routes appear automatically in effective routes table
- **Zero configuration**: No manual intervention required

> **Note**: This module only requires routing configuration for the AWS side. Azure routing is completely automatic via BGP.
