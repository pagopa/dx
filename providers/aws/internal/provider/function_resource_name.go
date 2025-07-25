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
		// Analytics
		"elasticsearch_domain": "es",
		"kinesis_firehose":     "firehose",
		"kinesis_stream":       "kinesis",
		"opensearch_domain":    "os",

		// API Gateway
		"api_gateway":                   "apigw",
		"api_gateway_account":           "apigw-account",
		"api_gateway_authorizer":        "apigw-auth",
		"api_gateway_base_path_mapping": "apigw-path-map",
		"api_gateway_deployment":        "apigw-deploy",
		"api_gateway_domain_name":       "apigw-domain",
		"api_gateway_integration":       "apigw-integration",
		"api_gateway_method":            "apigw-method",
		"api_gateway_method_settings":   "apigw-method-settings",
		"api_gateway_resource":          "apigw-resource",
		"api_gateway_rest_api":          "apigw-rest-api",
		"api_gateway_stage":             "apigw-stage",
		"api_gateway_v2":                "apigwv2",

		// Application Integration
		"eventbridge_bus":        "eb-bus",
		"eventbridge_rule":       "eb-rule",
		"pipes_pipe":             "pipes-pipe",
		"sns_subscription":       "sns-sub",
		"sns_topic":              "sns",
		"sns_topic_policy":       "sns-policy",
		"sns_topic_subscription": "sns-sub",
		"sqs_dead_letter_queue":  "sqs-dlq",
		"sqs_queue":              "sqs",
		"step_function":          "sf",

		// CDN
		"cloudfront_distribution":            "cf",
		"cloudfront_function":                "cf-func",
		"cloudfront_origin":                  "cf-origin",
		"cloudfront_origin_access_identity":  "cf-oai",
		"cloudfront_response_headers_policy": "cf-headers-policy",

		// Certificates
		"acm_certificate": "acm-cert",

		// Compute
		"auto_scaling_group":   "asg",
		"ec2_instance":         "ec2",
		"launch_configuration": "lc",
		"launch_template":      "lt",

		// Container Services
		"ecr_repository":      "ecr",
		"ecs_cluster":         "ecs",
		"ecs_service":         "ecssvc",
		"ecs_task_definition": "ecstd",
		"eks_cluster":         "eks",
		"eks_node_group":      "eks-ng",

		// Database
		"documentdb_cluster":  "docdb",
		"dynamodb_table":      "ddb",
		"elasticache_cluster": "redis",
		"elasticache_redis":   "redis",
		"rds_cluster":         "rdscluster",
		"rds_instance":        "rds",

		// DNS
		"route53_record": "r53-record",
		"route53_zone":   "r53-zone",

		// Identity & Access Management (IAM)
		"cognito_identity_pool":                  "cognito-id-pool",
		"cognito_identity_pool_roles_attachment": "cognito-id-roles",
		"cognito_user":                           "cognito-user",
		"cognito_user_group":                     "cognito-group",
		"cognito_user_pool":                      "cognito-pool",
		"cognito_user_pool_client":               "cognito-client",
		"cognito_user_pool_domain":               "cognito-domain",
		"iam_group":                              "group",
		"iam_group_policy_attachment":            "iam-group-policy",
		"iam_openid_connect_provider":            "iam-oidc",
		"iam_policy":                             "policy",
		"iam_policy_attachment":                  "iam-policy-attach",
		"iam_role":                               "role",
		"iam_role_policy":                        "iam-role-policy",
		"iam_role_policy_attachment":             "iam-role-attach",
		"iam_user":                               "user",

		// Load Balancing
		"application_load_balancer": "alb",
		"elastic_load_balancer":     "elb",
		"network_load_balancer":     "nlb",
		"target_group":              "tg",

		// Monitoring & Logging
		"cloudwatch_alarm":        "cw-alarm",
		"cloudwatch_dashboard":    "cw-dash",
		"cloudwatch_event_rule":   "cw-event-rule",
		"cloudwatch_event_target": "cw-event-target",
		"cloudwatch_log_group":    "cw-log",
		"cloudwatch_metric_alarm": "cw-metric-alarm",

		// Networking
		"elastic_ip":          "eip",
		"internet_gateway":    "igw",
		"nat_gateway":         "nat",
		"network_acl":         "nacl",
		"route_table":         "rt",
		"security_group":      "sg",
		"security_group_rule": "sg-rule",
		"subnet":              "snet",
		"vpc":                 "vpc",
		"vpc_endpoint":        "vpce",

		// Resource Management
		"resource_group": "rg",

		// Security
		"kms_key":                   "kms",
		"secrets_manager":           "sm",
		"wafv2_web_acl":             "waf-acl",
		"wafv2_web_acl_association": "waf-assoc",

		// Serverless
		"lambda_function":   "lambda",
		"lambda_permission": "lambda-perm",

		// Storage
		"ebs_volume":                        "ebs",
		"efs_access_point":                  "efs-access-point",
		"efs_file_system":                   "efs",
		"efs_mount_target":                  "efs-mount",
		"s3_bucket":                         "s3",
		"s3_bucket_acl":                     "s3-acl",
		"s3_bucket_lifecycle_configuration": "s3-lifecycle",
		"s3_bucket_ownership_controls":      "s3-ownership",
		"s3_bucket_policy":                  "s3-policy",
		"s3_bucket_public_access_block":     "s3-public-block",
		"s3_bucket_versioning":              "s3-versioning",

		// Systems Manager
		"ssm_parameter": "ssm-param",
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
		"euw3":         "euw3",
		"eu-west-3":    "euw3",
		"eun1":         "eun1",
		"eu-north-1":   "eun1",
		"eus1":         "eus1",
		"eu-south-1":   "eus1",
	}

	// Check if the region is valid and normalize it
	if normalizedRegion, valid := regionMappings[region]; valid {
		region = normalizedRegion
	} else {
		// Create a more dynamic error message listing allowed values
		allowedRegions := []string{"eu-west-1", "eu-central-1", "eu-west-3", "eu-north-1", "eu-south-1", "eu", "euc1", "euw3", "eun1", "eus1"}
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
