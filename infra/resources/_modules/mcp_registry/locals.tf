locals {
  api_center_name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-common-apic-mcp-registry-${format("%02d", var.naming_config.instance_number)}"

  # Flatten versions: { "dx-0.0.9" => { server_key = "dx", version = "0.0.9", ... }, ... }
  mcp_versions = merge([
    for server_key, server in var.mcp_servers : {
      for version in server.versions :
      "${server_key}-${version}" => {
        server_key  = server_key
        server_name = server.name
        version     = version
        uri         = server.uri
        protocols   = server.protocols
      }
    }
  ]...)
}
