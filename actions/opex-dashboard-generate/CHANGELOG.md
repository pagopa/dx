# Changelog

All notable changes to this action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of OpEx Dashboard Generate action
- Automatic detection of changed dashboard configs and OpenAPI specs
- Terraform generation using @pagopa/opex-dashboard
- Pull request creation with change summaries
- Fork protection built-in
- Security-hardened shell scripts with proper variable quoting
- Comprehensive documentation and examples

### Security

- Implemented proper shell script variable quoting to prevent injection attacks
- Added fork repository detection and protection
- Minimal permission requirements (contents: write, pull-requests: write)
