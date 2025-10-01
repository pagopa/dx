# Documenting DX Terraform Modules

This guide outlines the standards and best practices for writing documentation
for DX Terraform modules. Adhering to these guidelines ensures clarity,
consistency, and a positive user experience.

All documentation should go into the `README.md` file of the module. The
documentation should be structured and easy to navigate, with clear headings and
sections.

## General Principles

- **Audience-Centric:** Write for the user. Assume they have _basic_ Terraform
  knowledge and may be unfamiliar with the specific module.
- **Example-Driven:** Include examples to illustrate how to use the module. Use
  real-world scenarios to demonstrate functionality and document edge cases.
- **Up-to-Date:** Update the documentation whenever the module changes.
  Double-check all information, code examples, and links. Ensure the
  documentation reflects the current state of the module.
- **Automated Generation:** Use tools like `terraform-docs` to automatically
  generate input and output tables. Avoid documenting inputs, outputs and other
  generated content manually.
- **Abstract Enough:** Avoid documenting implementation details (ie. SKU) which
  are subject to change. Document tiered configurations instead. Focus on the
  module's purpose, features, and usage.

## Structure

### Module Overview

Start with a high-level overview of the module to provide context and help users
understand its purpose.

- **Title:** Use a clear and descriptive title.
- **Description:** Provide a concise summary of the module's purpose and
  functionality.
- **Features:** Highlight the key features and _benefits_ of the module.
- **Usage Example:** Include a minimal, working example of how to use the
  module. If the module already has a usage example, ensure it is up to date and
  add a link to it.

### Tiers and Configurations

Describe the different tiers of the module, such as basic, intermediate, and
advanced configurations. Document each tier to help users understand the
differences in usage, performance, costs and functionality.

### Usage Examples

When writing usage examples, consider documenting **multiple use cases**
providing examples for various scenarios. Start with a simple example and
gradually introduce more complex configurations.

### Troubleshooting

List common problems and solutions. Include error messages, potential causes,
and steps to resolve the issue. If possible, provide links to relevant
documentation or resources.

## Conclusion

By following these guidelines, you can contribute to creating high-quality
Terraform module documentation that is both informative and user-friendly.
