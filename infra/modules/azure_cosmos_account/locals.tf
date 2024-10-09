locals {
  primary_location = var.primary_geo_location.location == null ? var.environment.location : var.primary_geo_location.location
}