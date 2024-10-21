locals {
  ci_github_federations = tolist(flatten([
    for repo in var.repositories : {
      repository = repo
      subject    = "${var.env}-ci"
    }
  ]))

  cd_github_federations = tolist(flatten([
    for repo in var.repositories : {
      repository = repo
      subject    = "${var.env}-cd"
    }
  ]))
}
