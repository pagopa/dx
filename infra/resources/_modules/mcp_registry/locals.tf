locals {
  api_center_name = provider::azuredx::resource_name(merge(var.naming_config,
    {
      name          = "mcp-registry"
      resource_type = "api_center"
    }
  ))

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
