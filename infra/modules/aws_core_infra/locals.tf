locals {
  # Add module metadata to tags
  tags = merge(
    var.tags,
    {
      ModuleSource  = "DX",
      ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"),
      ModuleName    = try(jsondecode(file("${path.module}/package.json")).name, "unknown")
    }
  )

  # Location/region mapping for short names
  region_short = {
    "us-east-1"      = "use1",
    "us-west-2"      = "usw2",
    "eu-west-1"      = "euw1",
    "eu-central-1"   = "euc1",
    "ap-southeast-1" = "aps1",
    "eu-south-1"     = "eus1"
  }[var.environment.region]

  # Project naming convention
  project = "${var.environment.prefix}-${var.environment.env_short}-${local.region_short}"

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    region          = local.region_short,
    name            = var.environment.app_name,
    domain          = var.environment.domain,
    instance_number = tonumber(var.environment.instance_number),
  }

  # Use 3 AZs for high availability
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)

  # Calculate CIDR blocks for subnets (hardcoded to /24 for standardization)
  vpc_cidr_bits    = tonumber(split("/", var.vpc_cidr)[1])
  subnet_cidr_bits = 24

  # Public subnets (3 AZs)
  public_subnet_cidrs = [
    for i in range(3) : cidrsubnet(var.vpc_cidr, local.subnet_cidr_bits - local.vpc_cidr_bits, i)
  ]

  # Private subnets (3 AZs)
  private_subnet_cidrs = [
    for i in range(3) : cidrsubnet(var.vpc_cidr, local.subnet_cidr_bits - local.vpc_cidr_bits, i + 3)
  ]

  # Isolated subnets (always 3 for database/storage separation)
  isolated_subnet_cidrs = [
    for i in range(3) : cidrsubnet(var.vpc_cidr, local.subnet_cidr_bits - local.vpc_cidr_bits, i + 6)
  ]

  # Security settings based on environment
  is_production = var.environment.env_short == "p"

  # Automatically enable flow logs for production, optional for dev/test
  enable_flow_logs = local.is_production ? true : false

  # Disable auto-assign public IPs for security (all environments)
  map_public_ip_on_launch = false
}
