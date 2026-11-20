variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    region          = "eu-south-1"
    domain          = "test"
    app_name        = "github"
    instance_number = "01"
  }
  repository = {
    name = "example"
  }
  vpc = {
    id              = "vpc-0123456789abcdef0"
    private_subnets = ["subnet-0123456789abcdef0"]
  }
  github_private_runner = {
    codeconnection_arn = "arn:aws:codeconnections:eu-south-1:123456789012:connection/00000000-0000-0000-0000-000000000000"
    secrets            = {}
  }
  oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  tags = {
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "Terraform"
  }
}

mock_provider "aws" {
  mock_data "aws_iam_policy" {
    defaults = {
      arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

# Render IAM policy documents locally instead of mocking the trust policy JSON.
provider "aws" {
  alias                       = "policy_documents"
  region                      = "eu-south-1"
  access_key                  = "testing"
  secret_key                  = "testing"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
}

mock_provider "github" {
  mock_data "github_organization" {
    defaults = {
      id = "123456"
    }
  }
  mock_data "github_repository" {
    defaults = {
      repo_id = 654321
    }
  }
}

override_data {
  target = data.aws_iam_policy_document.ecs_read_only_access
  values = {
    json = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "ecs:Describe*"
        Resource = "*"
      }]
    })
  }
}

override_data {
  target = data.aws_iam_policy_document.ecr_push_access
  values = {
    json = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "ecr:PutImage"
        Resource = "*"
      }]
    })
  }
}

override_data {
  target = data.aws_iam_policy.admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  }
}

override_data {
  target = data.aws_iam_policy.read_only_access
  values = {
    arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
  }
}

override_data {
  target = data.aws_iam_policy.lambda_read_only_access
  values = {
    arn = "arn:aws:iam::aws:policy/AWSLambda_ReadOnlyAccess"
  }
}

override_data {
  target = data.aws_iam_policy.lambda_admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AWSLambda_FullAccess"
  }
}

override_data {
  target = data.aws_iam_policy.ecs_admin_access
  values = {
    arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
  }
}

override_module {
  target = module.github_runner
  outputs = {
    security_group = {
      id   = "sg-0123456789abcdef0"
      name = "test-runner"
    }
    iam_role = {
      arn  = "arn:aws:iam::123456789012:role/test-runner"
      name = "test-runner"
    }
  }
}

run "aws_github_environment_bootstrap_deployment_role_trust" {
  command = plan

  providers = {
    aws    = aws.policy_documents
    github = github
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : try(
        toset(jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"]) == toset(flatten([
          for slug in ["pagopa/example", "pagopa@123456/example@654321"] : [
            for environment in [
              "${role.scope}-dev-${role.phase}",
              "${role.scope}-*-dev-${role.phase}",
              "${role.scope}-dev-*-${role.phase}",
              "${role.scope}-*-dev-*-${role.phase}",
            ] : "repo:${slug}:environment:${environment}"
          ]
        ])),
        false
      )
    ])
    error_message = "Each deployment role must require its own scope, delimited lifecycle and CI/CD suffix, allowing optional tenant qualifiers in both subject formats."
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : alltrue([
          for slug in ["pagopa/example", "pagopa@123456/example@654321"] : alltrue([
            for environment in [
              "${role.scope}-dev-${role.phase}",
              "${role.scope}-ced-dev-${role.phase}",
              "${role.scope}-dev-ced-${role.phase}",
              "${role.scope}-tenant-a-dev-region-a-${role.phase}",
              ] : try(
              anytrue([
                for pattern in jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"] :
                can(regex("^${replace(pattern, "*", ".*")}$", "repo:${slug}:environment:${environment}"))
                ]) && !anytrue([
                for pattern in jsondecode(role.policy).Statement[0].Condition.StringNotLike["token.actions.githubusercontent.com:sub"] :
                can(regex("^${replace(pattern, "*", ".*")}$", "repo:${slug}:environment:${environment}"))
              ]),
              false
            )
          ])
      ])
    ])
    error_message = "Bare, tenant-prefixed, tenant-suffixed and doubly qualified dev environments must all match their own role, even when the tenant differs from the AWS resource prefix."
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : alltrue([
          for subject in concat(flatten([
            for slug in ["pagopa/example", "pagopa@123456/example@654321"] : [
              for environment in [
                "${role.scope}-dev-${role.phase == "ci" ? "cd" : "ci"}",
                "${role.scope == "infra" ? "app" : "infra"}-dev-${role.phase}",
                "automation-dev-${role.phase}",
                "opex-dev-${role.phase}",
                "bootstrapper-dev-${role.phase}",
                "other-dev-${role.phase}",
                "${role.scope}-prod-${role.phase}",
                "${role.scope}-tenant-prod-west-${role.phase}",
                "${role.scope}-uat-${role.phase}",
                "${role.scope}-notdev-${role.phase}",
                "${role.scope}-development-${role.phase}",
                "${role.scope}-dev-prod-${role.phase}",
                "${role.scope}-prod-dev-${role.phase}",
                "${role.scope}-dev-uat-${role.phase}",
                "${role.scope}-uat-dev-${role.phase}",
                "${role.scope}-dev-${role.phase}-extra",
              ] : "repo:${slug}:environment:${environment}"
            ]
            ]), [
            "repo:pagopa/example:pull_request",
            "repo:pagopa@123456/example@654321:ref:refs/heads/main",
            "repo:other-owner/example:environment:${role.scope}-dev-${role.phase}",
            "repo:pagopa/example-fork:environment:${role.scope}-dev-${role.phase}",
            "repo:pagopa@999/example@888:environment:${role.scope}-dev-${role.phase}",
            ]) : try(
            !anytrue([
              for pattern in jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"] :
              can(regex("^${replace(pattern, "*", ".*")}$", subject))
              ]) || anytrue([
              for pattern in jsondecode(role.policy).Statement[0].Condition.StringNotLike["token.actions.githubusercontent.com:sub"] :
              can(regex("^${replace(pattern, "*", ".*")}$", subject))
            ]),
            false
          )
      ])
    ])
    error_message = "Trust must reject other roles, unsupported scopes, repositories, no-environment jobs, lifecycle substrings and names containing conflicting lifecycle tokens."
  }

  assert {
    condition = alltrue([
      for policy in [
        aws_iam_role.infra_ci.assume_role_policy,
        aws_iam_role.infra_cd.assume_role_policy,
        aws_iam_role.app_ci.assume_role_policy,
        aws_iam_role.app_cd.assume_role_policy,
        ] : (
        length(jsondecode(policy).Statement) == 1 &&
        jsondecode(policy).Statement[0].Effect == "Allow" &&
        jsondecode(policy).Statement[0].Action == "sts:AssumeRoleWithWebIdentity" &&
        jsondecode(policy).Statement[0].Principal.Federated == var.oidc_provider_arn &&
        toset(keys(jsondecode(policy).Statement[0].Condition)) == toset(["StringLike", "StringNotLike", "ForAllValues:StringEquals"]) &&
        jsondecode(policy).Statement[0].Condition["ForAllValues:StringEquals"] == {
          "token.actions.githubusercontent.com:iss" = "https://token.actions.githubusercontent.com"
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      )
    ])
    error_message = "Deployment trust must retain a single web-identity statement with the configured provider, GitHub issuer, STS audience and lifecycle exclusions."
  }

  assert {
    condition = toset(jsondecode(aws_iam_role.ecr_public_login.assume_role_policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"]) == toset([
      "repo:pagopa/example:*",
      "repo:pagopa@123456/example@654321:*",
    ])
    error_message = "The dedicated token-only ECR Public role must retain repository-scoped trust for jobs without an environment."
  }
}

run "aws_github_environment_bootstrap_prefixed_deployment_role_trust" {
  command = plan

  providers = {
    aws    = aws.policy_documents
    github = github
  }

  variables {
    environment                       = merge(var.environment, { prefix = "ced", env_short = "u" })
    github_environment_prefix_enabled = true
    repository = {
      owner = "another-org"
      name  = "another-repo"
    }
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : try(
        toset(jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"]) == toset(flatten([
          for slug in ["another-org/another-repo", "another-org@123456/another-repo@654321"] : [
            for environment in [
              "${role.scope}-ced-uat-${role.phase}",
              "${role.scope}-*-ced-uat-${role.phase}",
              "${role.scope}-ced-uat-*-${role.phase}",
              "${role.scope}-*-ced-uat-*-${role.phase}",
            ] : "repo:${slug}:environment:${environment}"
          ]
        ])),
        false
      )
    ])
    error_message = "Deployment trust must follow the configured repository and prefixed UAT environments in both subject formats."
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : alltrue([
          for slug in ["another-org/another-repo", "another-org@123456/another-repo@654321"] : alltrue([
            for environment in ["${role.scope}-uat-${role.phase}", "${role.scope}-cgn-uat-${role.phase}"] : try(
              !anytrue([
                for pattern in jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"] :
                can(regex("^${replace(pattern, "*", ".*")}$", "repo:${slug}:environment:${environment}"))
              ]),
              false
            )
          ])
      ])
    ])
    error_message = "Enabling the GitHub environment prefix must keep that prefix required, rather than trusting unprefixed environments or another configured prefix."
  }
}

run "aws_github_environment_bootstrap_production_deployment_role_trust" {
  command = plan

  providers = {
    aws    = aws.policy_documents
    github = github
  }

  variables {
    environment = merge(var.environment, { env_short = "p" })
  }

  assert {
    condition = alltrue([
      for role in [
        { policy = aws_iam_role.infra_ci.assume_role_policy, scope = "infra", phase = "ci" },
        { policy = aws_iam_role.infra_cd.assume_role_policy, scope = "infra", phase = "cd" },
        { policy = aws_iam_role.app_ci.assume_role_policy, scope = "app", phase = "ci" },
        { policy = aws_iam_role.app_cd.assume_role_policy, scope = "app", phase = "cd" },
        ] : try(
        toset(jsondecode(role.policy).Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"]) == toset(flatten([
          for slug in ["pagopa/example", "pagopa@123456/example@654321"] : [
            for environment in [
              "${role.scope}-prod-${role.phase}",
              "${role.scope}-*-prod-${role.phase}",
              "${role.scope}-prod-*-${role.phase}",
              "${role.scope}-*-prod-*-${role.phase}",
            ] : "repo:${slug}:environment:${environment}"
          ]
        ])),
        false
      )
    ])
    error_message = "Production deployment roles must allow tenant-qualified production environments in both subject formats."
  }

  assert {
    condition = alltrue([
      for policy in [
        aws_iam_role.infra_ci.assume_role_policy,
        aws_iam_role.infra_cd.assume_role_policy,
        aws_iam_role.app_ci.assume_role_policy,
        aws_iam_role.app_cd.assume_role_policy,
        ] : try(
        toset(jsondecode(policy).Statement[0].Condition.StringNotLike["token.actions.githubusercontent.com:sub"]) == toset([
          "repo:*:environment:*-dev-*",
          "repo:*:environment:*-uat-*",
        ]),
        false
      )
    ])
    error_message = "Production roles must reject names that also contain dev or uat lifecycle tokens; tenant wildcards must not create cross-lifecycle trust."
  }
}

run "aws_github_environment_bootstrap_ecr_public_created_by_default" {
  command = plan

  override_resource {
    target          = aws_iam_role.ecr_public_login
    override_during = plan
    values = {
      arn = "arn:aws:iam::123456789012:role/test-ecr-public-login"
    }
  }

  assert {
    condition = (
      keys(github_actions_secret.repo_secrets) == ["ECR_PUBLIC_ROLE_ARN"]
    )
    error_message = "The AWS bootstrap must always create the repository-level ECR Public secret without an opt-in flag."
  }

  assert {
    condition = (
      github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].repository == "example" &&
      github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].secret_name == "ECR_PUBLIC_ROLE_ARN" &&
      github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].plaintext_value == aws_iam_role.ecr_public_login.arn &&
      output.ecr_public_role_arn == aws_iam_role.ecr_public_login.arn
    )
    error_message = "The repository secret and output must expose the dedicated login role ARN."
  }

  assert {
    condition = (
      aws_iam_role.ecr_public_login.name == "dx-d-eus1-test-ecr-public-login-role-01" &&
      aws_iam_role.ecr_public_login.assume_role_policy == data.aws_iam_policy_document.ecr_public_assume_role_policy.json &&
      aws_iam_role_policy.ecr_public_login.role == aws_iam_role.ecr_public_login.name
    )
    error_message = "The dedicated role must use DX naming, repository OIDC trust and its own inline policy."
  }

  assert {
    condition = jsondecode(aws_iam_role_policy.ecr_public_login.policy) == {
      Version = "2012-10-17"
      Statement = [
        {
          Effect   = "Allow"
          Action   = "ecr-public:GetAuthorizationToken"
          Resource = "*"
        },
        {
          Effect   = "Allow"
          Action   = "sts:GetServiceBearerToken"
          Resource = "*"
        }
      ]
    }
    error_message = "The login role must allow exactly the two token operations without requiring a service-name condition context."
  }

  assert {
    condition = (
      keys(github_actions_environment_secret.infra_ci) == ["ROLE_ARN"] &&
      keys(github_actions_environment_secret.app_ci) == ["ROLE_ARN"] &&
      keys(github_actions_environment_secret.infra_cd) == ["ROLE_ARN"] &&
      keys(github_actions_environment_secret.app_cd) == ["ROLE_ARN"]
    )
    error_message = "ECR Public login must not add or replace deployment environment secrets."
  }
}

run "aws_github_environment_bootstrap_ecr_public_repository_trust" {
  command = plan

  assert {
    condition = (
      length(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement) == 1 &&
      one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).effect == "Allow" &&
      one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).actions == toset(["sts:AssumeRoleWithWebIdentity"]) &&
      one(one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).principals).type == "Federated" &&
      one(one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).principals).identifiers == toset([var.oidc_provider_arn])
    )
    error_message = "Trust must allow only GitHub web identity federation via the configured OIDC provider."
  }

  assert {
    condition = one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).condition == toset([
      {
        test     = "StringLike"
        variable = "token.actions.githubusercontent.com:sub"
        values   = ["repo:pagopa/example:*", "repo:pagopa@123456/example@654321:*"]
      },
      {
        test     = "ForAllValues:StringEquals"
        variable = "token.actions.githubusercontent.com:iss"
        values   = ["https://token.actions.githubusercontent.com"]
      },
      {
        test     = "ForAllValues:StringEquals"
        variable = "token.actions.githubusercontent.com:aud"
        values   = ["sts.amazonaws.com"]
      }
    ])
    error_message = "Both repository subject formats, the GitHub issuer and the STS audience must remain scoped."
  }

  assert {
    condition = alltrue([
      for slug in ["pagopa/example", "pagopa@123456/example@654321"] : alltrue([
        for context in ["pull_request", "ref:refs/heads/main", "environment:infra-dev-ci", "environment:infra-prod-ci"] : anytrue([
          for pattern in one([
            for condition in one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).condition :
            condition.values if condition.variable == "token.actions.githubusercontent.com:sub"
          ]) : can(regex("^${replace(pattern, "*", ".*")}$", "repo:${slug}:${context}"))
        ])
      ])
    ])
    error_message = "Trust must cover no-environment PR/branch jobs and environment jobs across environments for both subject formats."
  }

  assert {
    condition = alltrue([
      for subject in ["repo:fork-owner/example:pull_request", "repo:pagopa/example-fork:environment:infra-dev-ci", "repo:fork-owner@999/example@888:pull_request"] : !anytrue([
        for pattern in one([
          for condition in one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).condition :
          condition.values if condition.variable == "token.actions.githubusercontent.com:sub"
        ]) : can(regex("^${replace(pattern, "*", ".*")}$", subject))
      ])
    ])
    error_message = "Subjects from other repositories, including fork repositories, must not match the trust policy."
  }
}

run "aws_github_environment_bootstrap_ecr_public_custom_repository" {
  command = plan

  variables {
    repository = {
      owner = "another-org"
      name  = "another-repo"
    }
  }

  assert {
    condition = tolist(one([
      for condition in one(data.aws_iam_policy_document.ecr_public_assume_role_policy.statement).condition :
      condition.values if condition.variable == "token.actions.githubusercontent.com:sub"
    ])) == tolist(["repo:another-org/another-repo:*", "repo:another-org@123456/another-repo@654321:*"])
    error_message = "OIDC trust must be derived from the configured repository, not hardcoded to pagopa/dx."
  }

  assert {
    condition     = github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].repository == "another-repo"
    error_message = "The ECR Public secret must be published in the configured repository."
  }
}

run "aws_github_environment_bootstrap_default_environment" {
  command = plan

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-dev-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-dev-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-dev-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-dev-cd",
    ])
    error_message = "The default prefix flag must preserve existing dev GitHub secret names."
  }
}

run "aws_github_environment_bootstrap_prefix_flag_preserves_cloud_names" {
  command = plan

  variables {
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-dx-dev-ci",
      aws_iam_role.infra_ci.name == "dx-d-eus1-test-infra-github-ci-role-01",
    ])
    error_message = "The prefix flag must affect GitHub environment names only."
  }
}

run "aws_github_environment_bootstrap_ced_tenant_environment" {
  command = plan

  variables {
    environment                       = merge(var.environment, { prefix = "ced" })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-ced-dev-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-ced-dev-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-ced-dev-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-ced-dev-cd",
      aws_iam_role.infra_ci.name == "ced-d-eus1-test-infra-github-ci-role-01",
    ])
    error_message = "The ced prefix must use distinct CI/CD GitHub secret environments."
  }
}

run "aws_github_environment_bootstrap_cgn_tenant_environment" {
  command = plan

  variables {
    environment                       = merge(var.environment, { prefix = "cgn" })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ROLE_ARN"].environment == "infra-cgn-dev-ci",
      github_actions_environment_secret.app_ci["ROLE_ARN"].environment == "app-cgn-dev-ci",
      github_actions_environment_secret.infra_cd["ROLE_ARN"].environment == "infra-cgn-dev-cd",
      github_actions_environment_secret.app_cd["ROLE_ARN"].environment == "app-cgn-dev-cd",
    ])
    error_message = "The cgn prefix must use its own CI/CD GitHub secret environments."
  }
}
