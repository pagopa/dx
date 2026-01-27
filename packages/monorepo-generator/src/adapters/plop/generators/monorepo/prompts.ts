import { type PlopGeneratorConfig } from "node-plop";
import { z } from "zod/v4";

export const payloadSchema = z.object({
  repoDescription: z.string().optional(),
  repoName: z.string().trim().min(1, "Repository name cannot be empty"),
  repoOwner: z.string().trim().default("pagopa"),
});

export type Payload = z.infer<typeof payloadSchema>;

const validatePrompt = (schema: z.ZodSchema) => (input: unknown) => {
  const error = schema.safeParse(input).error;
  return error
    ? // Return the error message defined in the Zod schema
      z.prettifyError(error)
    : true;
};

const getPrompts = (): PlopGeneratorConfig["prompts"] => [
  {
    message: "Repository name",
    name: "repoName",
    validate: validatePrompt(payloadSchema.shape.repoName),
  },
  {
    default: payloadSchema.shape.repoOwner.def.defaultValue,
    message: "GitHub repository owner (User or Organization)",
    name: "repoOwner",
    validate: validatePrompt(payloadSchema.shape.repoOwner),
  },
  {
    message: "Repository description",
    name: "repoDescription",
  },
];

export default getPrompts;
