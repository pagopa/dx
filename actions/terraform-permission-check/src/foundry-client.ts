/**
 * @fileoverview Gateway client for the Terraform permission-check action.
 *
 * The client calls the private APIM route with an Entra token acquired from the
 * Azure CLI login performed earlier in the workflow, avoiding static keys.
 */

import type { AccessToken, TokenCredential } from "@azure/identity";

import { AzureCliCredential } from "@azure/identity";

import { type FoundryResponse, FoundryResponseSchema } from "./schema.js";

export interface FoundryGatewayRequest {
  body: unknown;
  credential?: TokenCredential;
  fetchImpl?: typeof fetch;
  tokenScope: string;
  url: string;
}

export async function callFoundryGateway({
  body,
  credential = new AzureCliCredential(),
  fetchImpl = fetch,
  tokenScope,
  url,
}: FoundryGatewayRequest): Promise<string> {
  const token = await getRequiredToken(credential, tokenScope);
  const response = await fetchImpl(url, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Foundry gateway request failed with HTTP ${response.status}: ${responseBody}`,
    );
  }

  const parsedJson: unknown = JSON.parse(responseBody);
  const parseResult = FoundryResponseSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    throw new Error(
      `Foundry gateway response did not match the expected Responses API shape: ${parseResult.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  return extractOutputText(parseResult.data);
}

export function extractOutputText(response: FoundryResponse): string {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const outputText = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text && text.trim().length > 0))
    .join("\n")
    .trim();

  if (!outputText) {
    throw new Error("Foundry gateway response did not contain output text");
  }

  return outputText;
}

async function getRequiredToken(
  credential: TokenCredential,
  tokenScope: string,
): Promise<AccessToken> {
  const token = await credential.getToken(tokenScope);
  if (!token) {
    throw new Error(`Azure credential returned no token for ${tokenScope}`);
  }
  return token;
}
