# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "public"
      resource_type   = "subnet"
      instance_number = var.naming_config.instance_number + count.index
    })
    Type = "Public"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "private"
      resource_type   = "subnet"
      instance_number = var.naming_config.instance_number + count.index
    })
    Type = "Private"
  })
}

# Isolated Subnets (always 3 - completely isolated, no internet access)
resource "aws_subnet" "isolated" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.isolated_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "isolated"
      resource_type   = "subnet"
      instance_number = var.naming_config.instance_number + count.index
    })
    Type = "Isolated"
  })
}
