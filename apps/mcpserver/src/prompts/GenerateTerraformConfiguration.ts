/**
 * A prompt that generates a Terraform configuration following PagoPA DX best practices.
 * It guides the user to query the knowledge base for information on folder structure,
 * modules, and conventions before generating the code.
 */
export const GenerateTerraformConfigurationPrompt = {
  // The arguments for the prompt.
  arguments: [
    {
      description: "Requirements for the Terraform configuration to generate.",
      name: "requirements",
      required: false,
    },
  ],
  // The description of the prompt.
  description:
    "Generates a Terraform configuration following PagoPA DX best practices.",
  // The function that loads the prompt.
  load: async (args: {
    requirements?: string;
  }) => `To generate a Terraform configuration for ${args.requirements || "any requirement"}, you must follow the PagoPA DX best practices.

You can find information about the "infrastructure folder structure", "Using DX terraform modules", "Using DX terraform provider" and other conventions by using the \`QueryPagoPADXDocumentation\` tool. For example, you can ask "what is the infrastructure folder structure?", but you must ask for the other information as well.
It's suggested to call the \`QueryPagoPADXDocumentation\` tool multiple times to gather all the necessary information using simple and scoped questions.

When generating the configuration, remember to:
1.  Use existing Terraform modules from the \`pagopa-dx\` namespace whenever possible. You can search for them using the \`searchModules\` tool.
2.  Strictly follow the correct folder structure for infrastructure resources.
3.  Generate HCL code that is clean, readable, and well-documented.`,
  // The name of the prompt.
  name: "generate-terraform-configuration",
};
