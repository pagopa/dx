<p align="center">
    <img src="https://raw.githubusercontent.com/pagopa/.github/5ef0e41abf2d0b07d6b3ab62cc5cfda34c38822a/profile/logo.svg" width="180" height="50">
</p>

<hr>

# DX - Terraform Provider AWS

The **aws** Terraform provider is for Developer Experience, simplifies the creation and management of AWS resources following standardized naming conventions. This provider is maintained by the [PagoPA organization](https://github.com/pagopa) and is available at [terraform-provider-aws](https://github.com/pagopa-dx/terraform-provider-aws).

## Installation

To configure the provider, execute the following commands in the main directory of the repository:

```bash
go mod init github.com/pagopa-dx/terraform-provider-aws
go mod tidy
go build -o terraform-provider-aws
```

To configure the docs follow this documentation for [docs format](https://developer.hashicorp.com/terraform/registry/providers/docs) and [go generate](https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-documentation-generation)

```bash
cd tools
go mod init tools
go mod tidy
go generate
```

> [!NOTE]  
> If `go generate` return error for DataSource/Resource name, rename temporarly metadata to match name and re execute command

## Usage

### Required Provider Configuration

To use the aws provider in your Terraform configuration, include the following block:

```hcl
terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/aws"
    }
  }
}

provider "dx" {
  prefix      = "<project_prefix>" # e.g., "dx", "io"
  environment = "<environment>"    # d, u, or p (dev, uat, or prod)
  region      = "<region>"         # AWS region abbreviation
}
```

**Inputs:**

| Name        |  Type  | Required | Description                          |
| :---------- | :----: | :------: | :----------------------------------- |
| prefix      | String |    No    | Two-character project prefix.        |
| environment | String |    No    | Deployment environment (d, u, or p). |
| region      | String |    No    | AWS region abbreviation.             |
| domain      | String |    No    | Optional domain for naming.          |

**Supported AWS Regions:**

| Abbreviation | Full Region Name | Description        |
| :----------- | :--------------- | :----------------- |
| eu           | eu-west-1        | Europe (Ireland)   |
| euc1         | eu-central-1     | Europe (Frankfurt) |
| euw3         | eu-west-3        | Europe (Paris)     |
| eun1         | eu-north-1       | Europe (Stockholm) |
| eus1         | eu-south-1       | Europe (Milan)     |

## Resources

### dx_available_subnet_cidr

Find an available CIDR block for a new subnet within a specified AWS VPC.

**Inputs:**

| Name          |  Type   | Required | Description                                                                   |
| :------------ | :-----: | :------: | :---------------------------------------------------------------------------- |
| vpc_id        | String  |   Yes    | The ID of the AWS VPC where to allocate a CIDR block.                         |
| prefix_length | Integer |   Yes    | The desired prefix length for the new CIDR block (e.g., 24 for a /24 subnet). |

**Attributes:**

| Name       |  Type  | Description                                                    |
| :--------- | :----: | :------------------------------------------------------------- |
| id         | String | Unique identifier for the allocated CIDR block.                |
| cidr_block | String | The allocated CIDR block that can be used for subnet creation. |

**Example:**

```hcl
resource "dx_available_subnet_cidr" "next_cidr" {
  vpc_id        = aws_vpc.main.id
  prefix_length = 24  # For a /24 subnet
}

resource "aws_subnet" "new_subnet" {
  vpc_id               = aws_vpc.main.id
  cidr_block           = dx_available_subnet_cidr.next_cidr.cidr_block
  availability_zone    = "eu-west-1a"

  tags = {
    Name = "my-new-subnet"
  }
}
```

When creating multiple subnets, it is necessary to use `depends_on` to prevent CIDR block overlaps:

```hcl
resource "dx_available_subnet_cidr" "next_cidr_1" {
  vpc_id        = aws_vpc.main.id
  prefix_length = 24
}

resource "aws_subnet" "new_subnet_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = dx_available_subnet_cidr.next_cidr_1.cidr_block
  availability_zone = "eu-west-1a"

  tags = {
    Name = "my-new-subnet-1"
  }
}

resource "dx_available_subnet_cidr" "next_cidr_2" {
  vpc_id        = aws_vpc.main.id
  prefix_length = 28

  # Ensures the first CIDR block is allocated before finding the next one
  depends_on = [
    aws_subnet.new_subnet_1
  ]
}

resource "aws_subnet" "new_subnet_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = dx_available_subnet_cidr.next_cidr_2.cidr_block
  availability_zone = "eu-west-1b"

  tags = {
    Name = "my-new-subnet-2"
  }
}
```

## Functions

### resource_name

Generates a resource name based on the standardized prefix and additional parameters.

**Inputs:**

| Name            |  Type   | Required | Description                                                   |
| :-------------- | :-----: | :------: | :------------------------------------------------------------ |
| prefix          | String  |   Yes    | Prefix that define the repository domain (Max 2 characters).  |
| environment     | String  |   Yes    | Environment where the resources will be deployed (d, u or p). |
| region          | String  |   Yes    | AWS region where the resources will be deployed.              |
| domain          | String  |    No    | Optional value that specify the domain.                       |
| name            | String  |   Yes    | Name of the resource.                                         |
| resource_type   | String  |   Yes    | Type of the resource (see table).                             |
| instance_number | Integer |   Yes    | Instance number of the resource.                              |

**Example:**

```hcl
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    region = "eu",
    domain = "test",
    name = "app",
    resource_type = "s3_bucket",
    instance_number = 1,
  })
}
```

- **Output**: dx-d-eu-app-s3-01

> [!NOTE]  
> Remember that to call a function is needed the path provider::PROVIDER_NAME::FUNCTION_NAME(...)

**AWS Resource Types:**

The following table lists the resource types and their abbreviations used in the resource_name function:

| Type                      | Abbreviation |
| :------------------------ | :----------: |
| ec2_instance              |     ec2      |
| ecs_cluster               |     ecs      |
| ecs_service               |    ecssvc    |
| ecs_task_definition       |    ecstd     |
| lambda_function           |    lambda    |
| auto_scaling_group        |     asg      |
| launch_configuration      |      lc      |
| launch_template           |      lt      |
| s3_bucket                 |      s3      |
| ebs_volume                |     ebs      |
| efs_file_system           |     efs      |
| rds_instance              |     rds      |
| rds_cluster               |  rdscluster  |
| dynamodb_table            |     ddb      |
| elasticache_cluster       |    redis     |
| documentdb_cluster        |    docdb     |
| vpc                       |     vpc      |
| subnet                    |    subnet    |
| internet_gateway          |     igw      |
| nat_gateway               |     nat      |
| route_table               |      rt      |
| security_group            |      sg      |
| network_acl               |     nacl     |
| vpc_endpoint              |     vpce     |
| elastic_load_balancer     |     elb      |
| application_load_balancer |     alb      |
| network_load_balancer     |     nlb      |
| target_group              |      tg      |
| api_gateway               |    apigw     |
| api_gateway_v2            |   apigwv2    |
| api_gateway_stage         | apigw-stage  |
| api_gateway_deployment    | apigw-deploy |
| kms_key                   |     kms      |
| iam_role                  |     role     |
| iam_policy                |    policy    |
| iam_user                  |     user     |
| iam_group                 |    group     |
| secrets_manager           |      sm      |
| cloudwatch_log_group      |    cw-log    |
| cloudwatch_alarm          |   cw-alarm   |
| cloudwatch_dashboard      |   cw-dash    |
| sns_topic                 |     sns      |
| sqs_queue                 |     sqs      |
| cloudfront_distribution   |      cf      |
| cloudfront_origin         |  cf-origin   |
| ecr_repository            |     ecr      |
| eks_cluster               |     eks      |
| eks_node_group            |    eks-ng    |
| step_function             |      sf      |
| eventbridge_rule          |   eb-rule    |
| eventbridge_bus           |    eb-bus    |
| kinesis_stream            |   kinesis    |
| kinesis_firehose          |   firehose   |
| elasticsearch_domain      |      es      |
| opensearch_domain         |      os      |
| resource_group            |      rg      |
| route53_zone              |   r53-zone   |
| elasticache_redis         |    redis     |
| sqs_dead_letter_queue     |   sqs-dlq    |
| sns_subscription          |   sns-sub    |

## Example Configuration

```hcl
terraform {
  required_providers {
    dx = {
      source  = "pagopa-dx/aws"
    }
  }
}

provider "dx" {}

output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    region = "eu",
    domain = "test",
    name = "app",
    resource_type = "s3_bucket",
    instance_number = 1,
  })
}
```

**Result**: dx-d-eu-app-s3-01

<hr>

<p align="center">
    PagoPA S.p.A. <br>
    <a href="https://www.pagopa.it/">Web Site</a> | <a href="https://github.com/pagopa">Official GitHub</a> | <a href="https://twitter.com/pagopa">Twitter</a> | <a href="https://www.linkedin.com/company/pagopa/">Linkedin</a> | <a href="https://www.youtube.com/channel/UCFBGOEJUPQ6t3xtZFc_UIEQ">YouTube</a> | <a href="https://www.instagram.com/pagopaspa/">Instagram</a>
</p>

<hr>
