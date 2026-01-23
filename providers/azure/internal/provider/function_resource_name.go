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

// getResourceAbbreviations returns the mapping of resource types to their abbreviations
func getResourceAbbreviations() map[string]string {
	return map[string]string{
		// Compute
		"virtual_machine":           "vm",
		"container_app_job":         "caj",
		"container_app":             "ca",
		"container_app_environment": "cae",
		"container_instance":        "ci",

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
		"api_management":                            "apim",
		"api_management_autoscale":                  "apim-as",
		"virtual_network":                           "vnet",
		"network_security_group":                    "nsg",
		"apim_network_security_group":               "apim-nsg",
		"app_gateway":                               "agw",
		"cdn_frontdoor_profile":                     "afd",
		"cdn_frontdoor_endpoint":                    "fde",
		"cdn_frontdoor_origin_group":                "fdog",
		"cdn_frontdoor_origin":                      "fdo",
		"cdn_frontdoor_route":                       "cdnr",
		"nat_gateway":                               "ng",
		"postgre_endpoint":                          "psql-ep",
		"dns_forwarding_ruleset":                    "dnsfrs",
		"dns_private_resolver":                      "dnspr",
		"dns_private_resolver_inbound_endpoint":     "in",
		"dns_private_resolver_outbound_endpoint":    "out",
		"dns_private_resolver_virtual_network_link": "dnsprvnetlink",
		"virtual_network_gateway":                   "vgw",
		"local_network_gateway":                     "lgw",
		"virtual_network_gateway_connection":        "vgwcn",

		// Private Endpoints
		"private_endpoint":                   "pep",
		"cosmos_private_endpoint":            "cosno-pep",
		"postgre_private_endpoint":           "psql-pep",
		"postgre_replica_private_endpoint":   "psql-pep-replica",
		"app_private_endpoint":               "app-pep",
		"app_slot_private_endpoint":          "staging-app-pep",
		"function_private_endpoint":          "func-pep",
		"function_slot_private_endpoint":     "staging-func-pep",
		"blob_private_endpoint":              "blob-pep",
		"function_blob_private_endpoint":     "func-blob-pep",
		"dfunction_blob_private_endpoint":    "dfunc-blob-pep",
		"queue_private_endpoint":             "queue-pep",
		"function_queue_private_endpoint":    "func-queue-pep",
		"dfunction_queue_private_endpoint":   "dfunc-queue-pep",
		"file_private_endpoint":              "file-pep",
		"function_file_private_endpoint":     "func-file-pep",
		"dfunction_file_private_endpoint":    "dfunc-file-pep",
		"table_private_endpoint":             "table-pep",
		"function_table_private_endpoint":    "func-table-pep",
		"dfunction_table_private_endpoint":   "dfunc-table-pep",
		"eventhub_private_endpoint":          "evhns-pep",
		"container_app_private_endpoint":     "cae-pep",
		"key_vault_private_endpoint":         "kv-pep",
		"servicebus_private_endpoint":        "sbns-pep",
		"apim_private_endpoint":              "apim-pep",
		"app_configuration_private_endpoint": "appcs-pep",

		// Public IPs
		"public_ip": "pip",

		// Subnets
		"subnet":                    "snet",
		"app_subnet":                "app-snet",
		"apim_subnet":               "apim-snet",
		"function_subnet":           "func-snet",
		"container_app_subnet":      "cae-snet",
		"container_instance_subnet": "ci-snet",
		"private_endpoint_subnet":   "pep-snet",

		// Databases
		"cosmos_db_nosql":              "cosno",
		"customer_key_cosmos_db_nosql": "cosno-cmk",
		"postgresql":                   "psql",
		"postgresql_replica":           "psql-replica",
		"redis_cache":                  "redis",
		"mysql":                        "mysql",

		// Integration
		"eventhub_namespace":   "evhns",
		"servicebus_namespace": "sbns",
		"function_app":         "func",
		"app_service":          "app",
		"app_service_plan":     "asp",
		"static_web_app":       "stapp",
		"api_center":           "apic",

		// Security
		"key_vault":        "kv",
		"managed_identity": "id",

		// Monitoring
		"application_insights":           "appi",
		"log_analytics":                  "log",
		"cdn_monitor_diagnostic_setting": "cdnp",
		"monitor_alert_sbns_active":      "sbns-act-ma",
		"monitor_alert_sbns_dlq":         "sbns-dlq-ma",

		// Miscellaneous
		"resource_group":    "rg",
		"ai_search":         "srch",
		"load_testing":      "lt",
		"app_configuration": "appcs",
	}
}

// configurationValues holds the extracted configuration values
type configurationValues struct {
	prefix            string
	environment       string
	location          string
	resourceType      string
	instanceNumberStr string
	name              string
	domain            string
}

// extractConfigurationValues extracts and normalizes values from the configuration map
func extractConfigurationValues(configuration map[string]types.String) configurationValues {
	config := configurationValues{
		prefix:            configuration["prefix"].ValueString(),
		environment:       configuration["environment"].ValueString(),
		location:          configuration["location"].ValueString(),
		resourceType:      configuration["resource_type"].ValueString(),
		instanceNumberStr: configuration["instance_number"].ValueString(),
	}

	// Extract optional name
	if nameVal, exists := configuration["name"]; exists {
		config.name = strings.ToLower(nameVal.ValueString())
	}

	// Extract optional domain
	if domainVal, exists := configuration["domain"]; exists {
		config.domain = strings.ToLower(domainVal.ValueString())
	}

	return config
}

// validatePrefix checks if the prefix length is valid
func validatePrefix(prefix string) *function.FuncError {
	if len(prefix) < 2 || len(prefix) > 4 {
		return function.NewFuncError("Prefix must be between 2 and 4 characters long")
	}
	return nil
}

// validateEnvironment checks if the environment is valid
func validateEnvironment(environment string) *function.FuncError {
	env := strings.ToLower(environment)
	if env != "d" && env != "u" && env != "p" {
		return function.NewFuncError("Environment must be 'd', 'u' or 'p'")
	}
	return nil
}

// validateAndNormalizeLocation checks and normalizes the location
func validateAndNormalizeLocation(location string) (string, *function.FuncError) {
	locationMappings := map[string]string{
		"weu":        "weu",
		"westeurope": "weu",
		"itn":        "itn",
		"italynorth": "itn",
	}

	normalizedLocation := strings.ToLower(location)
	if normalized, valid := locationMappings[normalizedLocation]; valid {
		return normalized, nil
	}

	return "", function.NewFuncError("InvalidLocation: Location must be one of: westeurope, italynorth, weu, itn")
}

// parseInstanceNumber parses and validates the instance number string
func parseInstanceNumber(instanceNumber string) (int, *function.FuncError) {
	instance, err := strconv.Atoi(instanceNumber)
	if err != nil {
		return 0, function.NewFuncError("The instance_number must be a valid integer")
	}

	if instance < 1 || instance > 99 {
		return 0, function.NewFuncError("InvalidInstance: Instance must be between 1 and 99")
	}

	return instance, nil
}

// validateResourceType checks if the resource type is valid and returns its abbreviation
func validateResourceType(resourceType string, abbreviations map[string]string) (string, *function.FuncError) {
	abbr, ok := abbreviations[resourceType]
	if !ok {
		return "", function.NewFuncError(fmt.Sprintf("InvalidResourceType: resource '%s' not found", resourceType))
	}
	return abbr, nil
}

// validateRedundancy checks for redundant values between domain, name, and abbreviation
func validateRedundancy(domain, name, abbreviation string) *function.FuncError {
	normalizedName := strings.ToLower(name)
	normalizedAbbreviation := strings.ToLower(abbreviation)

	// Domain and name cannot be the same
	if domain != "" && normalizedName != "" && domain == normalizedName {
		return function.NewFuncError("Resource domain cannot be the same as the resource name")
	}

	// Check if abbreviation starts with domain (e.g., domain="psql", abbreviation="psql-pep")
	if domain != "" && strings.HasPrefix(normalizedAbbreviation, domain) {
		return function.NewFuncError("Resource domain cannot be part of the resource abbreviation. The abbreviation already contains the domain prefix")
	}

	// Check if abbreviation starts with name (e.g., name="cosno", abbreviation="cosno-pep")
	if normalizedName != "" && strings.HasPrefix(normalizedAbbreviation, normalizedName) {
		return function.NewFuncError("Resource name cannot be part of the resource abbreviation. The abbreviation already contains the name prefix")
	}

	return nil
}

// buildResourceName constructs the final resource name
func buildResourceName(prefix, environment, location, domain, name, abbreviation string, instance int) string {
	// Start with base: prefix-environment-location
	parts := []string{prefix, environment, location}

	// Add domain if provided
	if domain != "" {
		parts = append(parts, domain)
	}

	// Add name if provided
	if name != "" {
		parts = append(parts, strings.ToLower(name))
	}

	// Add abbreviation and instance
	parts = append(parts, strings.ToLower(abbreviation))

	result := strings.Join(parts, "-")
	return strings.ToLower(fmt.Sprintf("%s-%02d", result, instance))
}

func (f *resourceNameFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
	var configuration map[string]types.String

	resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &configuration))
	if resp.Error != nil {
		return
	}

	// Define and validate configuration keys
	requiredKeys := []string{"prefix", "environment", "location", "resource_type", "instance_number"}
	optionalKeys := []string{"domain", "name"}
	allowedKeys := append(requiredKeys, optionalKeys...)

	// Validate required keys are present
	for _, key := range requiredKeys {
		if _, exists := configuration[key]; !exists {
			resp.Error = function.NewFuncError(fmt.Sprintf("Missing key in input. The required key '%s' is missing from the input map", key))
			return
		}
	}

	// Validate no unexpected keys are provided
	for key := range configuration {
		if !contains(allowedKeys, key) {
			resp.Error = function.NewFuncError(fmt.Sprintf("Invalid key in input. The key '%s' is not allowed", key))
			return
		}
	}

	// Extract configuration values
	config := extractConfigurationValues(configuration)

	// Validate all inputs
	if err := validatePrefix(config.prefix); err != nil {
		resp.Error = err
		return
	}

	if err := validateEnvironment(config.environment); err != nil {
		resp.Error = err
		return
	}

	normalizedLocation, err := validateAndNormalizeLocation(config.location)
	if err != nil {
		resp.Error = err
		return
	}

	instance, err := parseInstanceNumber(config.instanceNumberStr)
	if err != nil {
		resp.Error = err
		return
	}

	abbreviations := getResourceAbbreviations()
	abbreviation, err := validateResourceType(config.resourceType, abbreviations)
	if err != nil {
		resp.Error = err
		return
	}

	// Validate no redundancy between domain, name, and abbreviation
	if err := validateRedundancy(config.domain, config.name, abbreviation); err != nil {
		resp.Error = err
		return
	}

	// Build the final resource name
	result := buildResourceName(config.prefix, config.environment, normalizedLocation, config.domain, config.name, abbreviation, instance)

	// Special handling for storage accounts (remove hyphens)
	if strings.Contains(config.resourceType, "storage_account") {
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
