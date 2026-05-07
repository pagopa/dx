# Converts short location code to full region name
output "location_long_from_short" {
  value = provider::dx::convert_location_to_long_format("itn")
}
