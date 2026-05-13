# Naming convention library — extracted from providers/azure/internal/provider/function_resource_name.go
# Builds and validates Azure resource names of the form:
#   <prefix>-<env>-<location>[-<domain>][-<name>]-<abbr>-<NN>
# For storage-account-like resource types, hyphens are removed (Azure constraint).
package lib.naming

import rego.v1

# Resource type → abbreviation. Mirrors getResourceAbbreviations() in the Go provider.
# Only the subset needed by this PoC is included; extending the map is trivial.
abbreviations := {
	# Storage
	"storage_account": "st",
	"function_storage_account": "stfn",
	# Networking
	"virtual_network": "vnet",
	"subnet": "snet",
	"function_subnet": "func-snet",
	"private_endpoint_subnet": "pep-snet",
	# Private Endpoints
	"private_endpoint": "pep",
	"function_private_endpoint": "func-pep",
	"blob_private_endpoint": "blob-pep",
	"file_private_endpoint": "file-pep",
	"queue_private_endpoint": "queue-pep",
	"table_private_endpoint": "table-pep",
	# Integration
	"function_app": "func",
	"app_service_plan": "asp",
	# Security
	"key_vault": "kv",
	"managed_identity": "id",
	# Monitoring
	"application_insights": "appi",
	"log_analytics": "log",
	# Misc
	"resource_group": "rg",
}

# Valid environments and locations, mirrored from validateEnvironment / validateAndNormalizeLocation.
valid_envs := {"d", "u", "p"}

valid_locations := {"weu", "itn"}

# Storage-account-like types have hyphens stripped from the final name.
is_storage_like(resource_type) if {
	contains(resource_type, "storage_account")
}

# Build the expected name for a configuration map. Returns "" if config is invalid.
expected_name(config) := name if {
	abbr := abbreviations[config.resource_type]
	config.environment in valid_envs
	config.location in valid_locations
	count(config.prefix) >= 2
	count(config.prefix) <= 4
	instance := to_number(config.instance_number)
	instance >= 1
	instance <= 99

	parts := array.concat(
		array.concat(
			[config.prefix, config.environment, config.location],
			optional_parts(config),
		),
		[abbr, sprintf("%02d", [instance])],
	)
	dashed := lower(concat("-", parts))
	name := compact_if_storage(config.resource_type, dashed)
}

optional_parts(config) := parts if {
	d := object.get(config, "domain", "")
	n := object.get(config, "name", "")
	parts := [p |
		some p in [d, n]
		p != ""
	]
}

compact_if_storage(resource_type, dashed) := result if {
	is_storage_like(resource_type)
	result := replace(dashed, "-", "")
}

compact_if_storage(resource_type, dashed) := dashed if {
	not is_storage_like(resource_type)
}

# True iff `name` matches what the provider would produce for `config`.
valid_name(config, name) if {
	expected_name(config) == lower(name)
}

# Generic regex check (used when we don't know the full config but want a
# sanity check on shape). The dashed pattern matches everything except
# storage-like types.
dashed_pattern := `^[a-z0-9]{2,4}-[dup]-(weu|itn)(-[a-z0-9-]+)?-[a-z][a-z0-9-]*-[0-9]{2}$`

storage_shape_ok(resource_type, name) if {
	abbr := abbreviations[resource_type]
	pattern := sprintf(`^[a-z0-9]{2,4}[dup](weu|itn)[a-z0-9]*%s[0-9]{2}$`, [abbr])
	regex.match(pattern, lower(name))
}

shape_ok(resource_type, name) if {
	is_storage_like(resource_type)
	storage_shape_ok(resource_type, name)
}

shape_ok(resource_type, name) if {
	not is_storage_like(resource_type)
	regex.match(dashed_pattern, lower(name))
}
