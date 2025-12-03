import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["mcpserver", "ssm"]);

/**
 * Retrieves a secure string parameter from AWS Systems Manager Parameter Store.
 *
 * @param parameterName - The name of the SSM parameter to retrieve
 * @param region - AWS region (defaults to AWS_REGION env var or eu-central-1)
 * @returns The decrypted parameter value
 * @throws Error if the parameter cannot be retrieved or is not found
 */
export async function getSecureParameter(
  parameterName: string,
  region?: string,
): Promise<string> {
  const awsRegion = region || process.env.AWS_REGION || "eu-central-1";

  logger.debug(`Retrieving secure parameter: ${parameterName}`, {
    region: awsRegion,
  });

  const client = new SSMClient({ region: awsRegion });

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
}
