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
      aws_iam_role.ecr_public_login.assume_role_policy == data.aws_iam_policy_document.github_assume_role_policy.json &&
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
          Condition = {
            StringEquals = {
              "sts:AWSServiceName" = "ecr-public.amazonaws.com"
            }
          }
        }
      ]
    }
    error_message = "The login role must allow only the two ECR Public token operations, with STS limited to ECR Public."
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
      length(data.aws_iam_policy_document.github_assume_role_policy.statement) == 1 &&
      one(data.aws_iam_policy_document.github_assume_role_policy.statement).effect == "Allow" &&
      one(data.aws_iam_policy_document.github_assume_role_policy.statement).actions == toset(["sts:AssumeRoleWithWebIdentity"]) &&
      one(one(data.aws_iam_policy_document.github_assume_role_policy.statement).principals).type == "Federated" &&
      one(one(data.aws_iam_policy_document.github_assume_role_policy.statement).principals).identifiers == toset([var.oidc_provider_arn])
    )
    error_message = "Trust must allow only GitHub web identity federation via the configured OIDC provider."
  }

  assert {
    condition = one(data.aws_iam_policy_document.github_assume_role_policy.statement).condition == toset([
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
            for condition in one(data.aws_iam_policy_document.github_assume_role_policy.statement).condition :
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
          for condition in one(data.aws_iam_policy_document.github_assume_role_policy.statement).condition :
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
      for condition in one(data.aws_iam_policy_document.github_assume_role_policy.statement).condition :
      condition.values if condition.variable == "token.actions.githubusercontent.com:sub"
    ])) == tolist(["repo:another-org/another-repo:*", "repo:another-org@123456/another-repo@654321:*"])
    error_message = "OIDC trust must be derived from the configured repository, not hardcoded to pagopa/dx."
  }

  assert {
    condition     = github_actions_secret.repo_secrets["ECR_PUBLIC_ROLE_ARN"].repository == "another-repo"
    error_message = "The ECR Public secret must be published in the configured repository."
  }
}
