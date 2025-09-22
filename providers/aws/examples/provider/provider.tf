provider "dx" {
  prefix      = "<project_prefix>" # e.g., "dx", "io" (Optional)
  environment = "<environment>"    # d, u, or p (dev, uat, or prod) (Optional)
  region      = "<region>"         # e.g., "eus1" (Milan), "eu-central-1" (Frankfurt), "eu" (Ireland) (Optional)
  domain      = "<domain>"         # e.g., "test" (Optional)
}
