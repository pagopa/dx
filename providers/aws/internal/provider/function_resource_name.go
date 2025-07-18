// Package provider implements AWS resource naming function
package provider

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/hashicorp/terraform-plugin-framework/function"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

var _ function.Function = &resourceNameFunction{}

type resourceNameFunction struct {
}

func (f *resourceNameFunction) Metadata(ctx context.Context, req function.MetadataRequest, resp *function.MetadataResponse) {
	resp.Name = "resource_name"
}

func (f *resourceNameFunction) Definition(ctx context.Context, req function.DefinitionRequest, resp *function.DefinitionResponse) {
	resp.Definition = function.Definition{
		Summary:     "Return AWS dx resources naming convention",
		Description: "Given a name, a resource name, an instance number and a resource type, returns the AWS dx resources naming convention.",

		Parameters: []function.Parameter{
			function.MapParameter{
				Name:           "configuration",
				Description:    "A map containing the following keys: prefix, environment, region, domain (Optional), name, resource_type and instance_number.",
				ElementType:    types.StringType,
				AllowNullValue: true,
			},
		},
		Return: function.StringReturn{},
	}
}

func (f *resourceNameFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
	var configuration map[string]types.String

	var result string

	// AWS resource type abbreviations
	var resourceAbbreviations = map[string]string{
		// Compute
		"ec2_instance":         "ec2",
		"ecs_cluster":          "ecs",
		"ecs_service":          "ecssvc",
		"ecs_task_definition":  "ecstd",
		"lambda_function":      "lambda",
		"auto_scaling_group":   "asg",
		"launch_configuration": "lc",
		"launch_template":      "lt",

		// Storage
		"s3_bucket":       "s3",
		"ebs_volume":      "ebs",
		"efs_file_system": "efs",

		// Database
		"rds_instance":        "rds",
		"rds_cluster":         "rdscluster",
		"dynamodb_table":      "ddb",
		"elasticache_cluster": "redis",
		"documentdb_cluster":  "docdb",

		// Networking
		"vpc":                       "vpc",
		"subnet":                    "snet",
		"internet_gateway":          "igw",
		"nat_gateway":               "nat",
		"route_table":               "rt",
		"security_group":            "sg",
		"network_acl":               "nacl",
		"vpc_endpoint":              "vpce",
		"elastic_load_balancer":     "elb",
		"application_load_balancer": "alb",
		"network_load_balancer":     "nlb",
		"target_group":              "tg",

		// API Management
		"api_gateway":            "apigw",
		"api_gateway_v2":         "apigwv2",
		"api_gateway_stage":      "apigw-stage",
		"api_gateway_deployment": "apigw-deploy",

		// Security
		"kms_key":         "kms",
		"iam_role":        "role",
		"iam_policy":      "policy",
		"iam_user":        "user",
		"iam_group":       "group",
		"secrets_manager": "sm",

		// Monitoring
		"cloudwatch_log_group": "cw-log",
		"cloudwatch_alarm":     "cw-alarm",
		"cloudwatch_dashboard": "cw-dash",
		"sns_topic":            "sns",
		"sqs_queue":            "sqs",

		// CDN
		"cloudfront_distribution": "cf",
		"cloudfront_origin":       "cf-origin",

		// Container Services
		"ecr_repository": "ecr",
		"eks_cluster":    "eks",
		"eks_node_group": "eks-ng",

		// Serverless
		"step_function":    "sf",
		"eventbridge_rule": "eb-rule",
		"eventbridge_bus":  "eb-bus",

		// Analytics
		"kinesis_stream":       "kinesis",
		"kinesis_firehose":     "firehose",
		"elasticsearch_domain": "es",
		"opensearch_domain":    "os",

		// Resource Groups
		"resource_group": "rg",

		// Route53
		"route53_zone": "r53-zone",

		// ElastiCache specific
		"elasticache_redis": "redis",

		// Application Integration
		"sqs_dead_letter_queue": "sqs-dlq",
		"sns_subscription":      "sns-sub",
	}

	resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &configuration))

	if resp.Error != nil {
		return
	}

	requiredKeys := []string{
		"prefix",
		"environment",
		"region",
		"name",
		"resource_type",
		"instance_number",
	}
	optionalKeys := []string{
		"domain",
	}
	allowedKeys := append(requiredKeys, optionalKeys...)

	// Check required keys
	for _, key := range requiredKeys {
		if _, exists := configuration[key]; !exists {
			resp.Error = function.NewFuncError(fmt.Sprintf("Missing key in input. The required key '%s' is missing from the input map", key))
			return
		}
	}

	// Validate keys
	for key := range configuration {
		if !contains(allowedKeys, key) {
			resp.Error = function.NewFuncError(fmt.Sprintf("Invalid key in input. The key '%s' is not allowed", key))
			return
		}
	}

	prefix := configuration["prefix"].ValueString()
	environment := configuration["environment"].ValueString()
	region := configuration["region"].ValueString()
	name := configuration["name"].ValueString()
	resourceType := configuration["resource_type"].ValueString()
	instanceNumberStr := configuration["instance_number"].ValueString()

	// Validate instance number
	instance, err := strconv.Atoi(instanceNumberStr)
	if err != nil {
		resp.Error = function.NewFuncError("The instance_number must be a valid integer")
		return
	}

	// Validate provider Prefix configuration
	if len(prefix) != 2 {
		resp.Error = function.NewFuncError("Prefix must be 2 characters long")
		return
	}

	// Validate provider Environment configuration
	if strings.ToLower(environment) != "d" && strings.ToLower(environment) != "u" && strings.ToLower(environment) != "p" {
		resp.Error = function.NewFuncError("Environment must be 'd', 'u' or 'p'")
		return
	}

	// Convert region to lowercase once
	region = strings.ToLower(region)

	// Define valid AWS regions and their normalized values
	regionMappings := map[string]string{
		"eu":           "eu",
		"eu-west-1":    "eu",
		"euc1":         "euc1",
		"eu-central-1": "euc1",
		"euc2":         "euc2",
		"eu-central-2": "euc2",
		"euw2":         "euw2",
		"eu-west-2":    "euw2",
		"euw3":         "euw3",
		"eu-west-3":    "euw3",
		"eun1":         "eun1",
		"eu-north-1":   "eun1",
		"eus1":         "eus1",
		"eu-south-1":   "eus1",
		"eus2":         "eus2",
		"eu-south-2":   "eus2",
	}

	// Check if the region is valid and normalize it
	if normalizedRegion, valid := regionMappings[region]; valid {
		region = normalizedRegion
	} else {
		// Create a more dynamic error message listing allowed values
		allowedRegions := []string{"eu-west-1", "eu-central-1", "eu-central-2", "eu-west-2", "eu-west-3", "eu-north-1", "eu-south-1", "eu-south-2", "eu", "euc1", "euc2", "euw2", "euw3", "eun1", "eus1", "eus2"}
		resp.Error = function.NewFuncError(fmt.Sprintf("InvalidRegion: Region must be one of: %s", strings.Join(allowedRegions, ", ")))
		return
	}

	// Validate instance number
	if instance < 1 || instance > 99 {
		resp.Error = function.NewFuncError("InvalidInstance: Instance must be between 1 and 99")
		return
	}

	// Validate resource type
	abbreviation, exists := resourceAbbreviations[resourceType]
	if !exists {
		validKeys := make([]string, 0, len(resourceAbbreviations))
		for key := range resourceAbbreviations {
			validKeys = append(validKeys, key)
		}
		resp.Error = function.NewFuncError(fmt.Sprintf("InvalidResourceType: resource '%s' not found", resourceType))
		return
	}

	// Validate resource name
	if name == "" {
		resp.Error = function.ConcatFuncErrors(function.NewFuncError("Resource name cannot be empty"))
		return
	}

	// Check if domain is provided and not null
	domain, domainExists := configuration["domain"]
	if domainExists && !domain.IsNull() && domain.ValueString() != "" {
		result = fmt.Sprintf("%s-%s-%s-%s",
			prefix,
			environment,
			region,
			domain.ValueString())
	} else {
		result = fmt.Sprintf("%s-%s-%s",
			prefix,
			environment,
			region)
	}

	// Generate resource name
	result = strings.ToLower(fmt.Sprintf("%s-%s-%s-%02d",
		result,
		name,
		abbreviation,
		instance))

	// Special handling for S3 buckets - they need globally unique names and no underscores
	if resourceType == "s3_bucket" {
		result = strings.ReplaceAll(result, "_", "-")
	}

	resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, result))
}

func contains(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}
