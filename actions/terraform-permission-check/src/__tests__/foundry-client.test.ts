import type { AccessToken, TokenCredential } from "@azure/identity";

import { describe, expect, it } from "vitest";

import { callFoundryGateway, extractOutputText } from "../foundry-client.js";

class FakeCredential implements TokenCredential {
  async getToken(): Promise<AccessToken> {
    return {
      expiresOnTimestamp: Date.now() + 60_000,
      token: "fake-token",
    };
  }
}

describe("callFoundryGateway", () => {
  it("sends an Entra bearer token and returns output_text", async () => {
    let receivedInput: RequestInfo | undefined | URL;
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      receivedInput = input;
      receivedInit = init;
      return new Response(JSON.stringify({ output_text: "## report" }), {
        status: 200,
      });
    };

    const output = await callFoundryGateway({
      body: { input: "hello" },
      credential: new FakeCredential(),
      fetchImpl,
      tokenScope: "https://ai.azure.com/.default",
      url: "https://gateway.example/ai/v1/responses",
    });

    expect(output).toBe("## report");
    expect(receivedInput).toBe("https://gateway.example/ai/v1/responses");
    expect(receivedInit?.method).toBe("POST");
    expect(receivedInit?.headers).toEqual({
      Authorization: "Bearer fake-token",
      "Content-Type": "application/json",
    });
  });

  it("reports the gateway URL and transport cause when the request fails", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError("fetch failed", {
        cause: new Error("getaddrinfo ENOTFOUND dx-d-itn-ai-apim-01"),
      });
    };

    await expect(
      callFoundryGateway({
        body: { input: "hello" },
        credential: new FakeCredential(),
        fetchImpl,
        tokenScope: "https://ai.azure.com/.default",
        url: "https://dx-d-itn-ai-apim-01/ai/v1/responses",
      }),
    ).rejects.toThrow(
      "Foundry gateway request to https://dx-d-itn-ai-apim-01/ai/v1/responses failed: fetch failed: getaddrinfo ENOTFOUND dx-d-itn-ai-apim-01",
    );
  });

  it("extracts text from standard Responses API output content", () => {
    expect(
      extractOutputText({
        output: [
          {
            content: [
              { text: "line one", type: "output_text" },
              { text: "line two", type: "output_text" },
            ],
          },
        ],
      }),
    ).toBe("line one\nline two");
  });
});
