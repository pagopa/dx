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
		Summary:     "Return Azure dx resources naming convention",
		Description: "Given a name, a resource name, an instance number and a resource type, returns the Azure dx resources naming convention.",

		Parameters: []function.Parameter{
			function.MapParameter{
				Name:           "configuration",
				Description:    "A map containing the following keys: prefix, environment, location, domain (Optional), name, resource_type and instance_number.",
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

	var resourceAbbreviations = map[string]string{
		// Compute
		"virtual_machine":           "vm",
		"container_app_job":         "caj",
		"container_app":             "ca",
		"container_app_environment": "cae",

		// Storage
		"storage_account":                  "st",
		"blob_storage":                     "blob",
		"queue_storage":                    "queue",
		"table_storage":                    "table",
		"file_storage":                     "file",
		"function_storage_account":         "stfn",
		"customer_key_storage_account":     "stcmk",
		"durable_function_storage_account": "stfd",

		// Networking
		"api_management":              "apim",
		"api_management_autoscale":    "apim-as",
		"virtual_network":             "vnet",
		"network_security_group":      "nsg",
		"apim_network_security_group": "apim-nsg",
		"app_gateway":                 "agw",
		"cdn_frontdoor_profile":       "afd",
		"cdn_frontdoor_endpoint":      "fde",
		"cdn_frontdoor_origin_group":  "fdog",
		"cdn_frontdoor_origin":        "fdo",
		"cdn_frontdoor_route":         "cdnr",
		"nat_gateway":                 "ng",
		"postgre_endpoint":            "psql-ep",

		// Private Endpoints
		"private_endpoint":                 "pep",
		"cosmos_private_endpoint":          "cosno-pep",
		"postgre_private_endpoint":         "psql-pep",
		"postgre_replica_private_endpoint": "psql-pep-replica",
		"app_private_endpoint":             "app-pep",
		"app_slot_private_endpoint":        "staging-app-pep",
		"function_private_endpoint":        "func-pep",
		"function_slot_private_endpoint":   "staging-func-pep",
		"blob_private_endpoint":            "blob-pep",
		"queue_private_endpoint":           "queue-pep",
		"file_private_endpoint":            "file-pep",
		"table_private_endpoint":           "table-pep",
		"eventhub_private_endpoint":        "evhns-pep",
		"container_app_private_endpoint":   "cae-pep",
		"key_vault_private_endpoint":       "kv-pep",

		// Public IPs
		"public_ip": "pip",

		// Subnets
		"subnet":                  "snet",
		"app_subnet":              "app-snet",
		"apim_subnet":             "apim-snet",
		"function_subnet":         "func-snet",
		"container_app_subnet":    "cae-snet",
		"private_endpoint_subnet": "pep-snet",

		// Databases
		"cosmos_db":          "cosmos",
		"cosmos_db_nosql":    "cosno",
		"postgresql":         "psql",
		"postgresql_replica": "psql-replica",
		"redis_cache":        "redis",

		// Integration
		"eventhub_namespace": "evhns",
		"function_app":       "func",
		"app_service":        "app",
		"app_service_plan":   "asp",
		"static_web_app":     "stapp",

		// Security
		"key_vault": "kv",

		// Monitoring
		"application_insights":           "appi",
		"log_analytics":                  "log",
		"cdn_monitor_diagnostic_setting": "cdnp",

		// Miscellaneous
		"resource_group": "rg",
		"ai_search":      "srch",
		"load_testing":   "lt",
	}

	resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &configuration))

	if resp.Error != nil {
		return
	}

	requiredKeys := []string{
		"prefix",
		"environment",
		"location",
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
			resp.Error = function.NewFuncError(fmt.Sprintf("Missing key in input. The required key '%s' is missing from the input map.", key))
			return
		}
	}

	// Validate keys
	for key := range configuration {
		if !contains(allowedKeys, key) {
			resp.Error = function.NewFuncError(fmt.Sprintf("Invalid key in input. The key '%s' is not allowed.", key))
			return
		}
	}

	prefix := configuration["prefix"].ValueString()
	environment := configuration["environment"].ValueString()
	location := configuration["location"].ValueString()
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

	// Convert location to lowercase once
	location = strings.ToLower(location)

	// Define valid locations and their normalized values
	locationMappings := map[string]string{
		"weu":        "weu",
		"westeurope": "weu",
		"itn":        "itn",
		"italynorth": "itn",
	}

	// Check if the location is valid and normalize it
	if normalizedLocation, valid := locationMappings[location]; valid {
		location = normalizedLocation
	} else {
		// Create a more dynamic error message listing allowed values
		allowedLocations := []string{"westeurope", "italynorth", "weu", "itn"}
		resp.Error = function.NewFuncError(fmt.Sprintf("Location must be one of: %s", strings.Join(allowedLocations, ", ")))
		return
	}

	// Validate instance number
	if instance < 1 || instance > 99 {
		resp.Error = function.NewFuncError("Instance must be between 1 and 99")
		return
	}

	// Validate resource type
	abbreviation, exists := resourceAbbreviations[resourceType]
	if !exists {
		validKeys := make([]string, 0, len(resourceAbbreviations))
		for key := range resourceAbbreviations {
			validKeys = append(validKeys, key)
		}
		resp.Error = function.NewFuncError(fmt.Sprintf("resource '%s' not found. Accepted values are: %s", resourceType, strings.Join(validKeys, ", ")))
		return
	}

	// Validate resource name
	if name == "" {
		resp.Error = function.NewFuncError("Resource name cannot be empty")
		return
	}

	// Check if domain is provided and not null
	domain, domainExists := configuration["domain"]
	if domainExists && !domain.IsNull() && domain.ValueString() != "" {
		result = fmt.Sprintf("%s-%s-%s-%s",
			prefix,
			environment,
			location,
			domain.ValueString())
	} else {
		result = fmt.Sprintf("%s-%s-%s",
			prefix,
			environment,
			location)
	}

	// Generate resource name
	result = strings.ToLower(fmt.Sprintf("%s-%s-%s-%02d",
		result,
		name,
		abbreviation,
		instance))

	if strings.Contains(resourceType, "storage_account") {
		result = strings.ReplaceAll(result, "-", "")
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
