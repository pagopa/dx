export const GenerateTerraformConfigurationPrompt = {
  name: "generate-terraform-configuration",
  description:
    "Generates a Terraform configuration following PagoPA DX best practices.",
  arguments: [
    {
      name: "requirements",
      description: "Requirements for the Terraform configuration to generate.",
      required: true,
    },
  ],
  load: async (args: any) => {
    return `To generate a Terraform configuration for ${args.requirements}, you must follow the PagoPA DX best practices.

You can find information about the "infrastructure folder structure", "Using DX terraform modules", "Using DX terraform provider" and other conventions by using the \`QueryPagoPADXDocumentation\` tool. For example, you can ask "what is the infrastructure folder structure?".

When generating the configuration, remember to:
1.  Use existing Terraform modules from the \`pagopa-dx\` namespace whenever possible. You can search for them using the \`searchModules\` tool.
2.  Follow the correct folder structure for infrastructure resources.
3.  Generate HCL code that is clean, readable, and well-documented.`;
  },
};
