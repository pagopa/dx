import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["mcpserver", "ssm"]);

const DEFAULT_AWS_REGION = "eu-central-1";

/**
 * Creates a preconfigured SSM client tied to the desired AWS region.
 * @param region Optional AWS region; falls back to AWS_REGION or eu-central-1.
 * @returns Configured SSM client ready for Parameter Store calls.
 */
export const createSsmClient = (region?: string): SSMClient => {
  const awsRegion = region || process.env.AWS_REGION || DEFAULT_AWS_REGION;

  logger.debug("Creating SSM client", { region: awsRegion });

  return new SSMClient({ region: awsRegion });
};

/**
 * Retrieves a secure string parameter from AWS Systems Manager Parameter Store using an existing SSM client.
 *
 * @param client Initialized SSM client.
 * @param options.region Optional region override used for logging; defaults to AWS_REGION or eu-central-1.
 * @returns Curried function that resolves parameter values by name.
 * @throws Error if the parameter cannot be retrieved or is not found.
 */
export const getSecureParameter =
  (client: SSMClient, options?: { region?: string }) =>
  async (parameterName: string): Promise<string> => {
    const resolvedRegion =
      options?.region || process.env.AWS_REGION || DEFAULT_AWS_REGION;

    logger.debug(`Retrieving secure parameter: ${parameterName}`, {
      region: resolvedRegion,
    });

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      });

      const response = await client.send(command);

      if (!response.Parameter?.Value) {
        throw new Error(`Parameter ${parameterName} not found or has no value`);
      }

      logger.debug(`Successfully retrieved parameter: ${parameterName}`);
      return response.Parameter.Value;
    } catch (error) {
      logger.error(`Failed to retrieve parameter: ${parameterName}`, {
        error,
      });
      throw error;
    }
  };
