locals {
  ci_github_federations = tolist(flatten([
    for repo in var.repositories : {
      repository = repo
      subject    = var.override_gh_environment != null ? var.override_gh_environment : "${var.env}-ci"
    }
  ]))

  cd_github_federations = tolist(flatten([
    for repo in var.repositories : {
      repository = repo
      subject    = var.override_gh_environment != null ? var.override_gh_environment : "${var.env}-cd"
    }
  ]))
}
