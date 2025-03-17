# Generates a resource name based on the standardized prefix and additional parameters.
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    name = "app",
    resource_type = "blob_private_endpoint",
    instance_number = 1,
  })
}