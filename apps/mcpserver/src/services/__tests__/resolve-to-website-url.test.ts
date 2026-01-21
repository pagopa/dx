it("returns dx.pagopa.it/llms-full.txt for llms-full.txt", () => {
  const location = {
    s3Location: {
      uri: "s3://bucket/llms-full.txt",
    },
    type: "S3" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
  };
  const result = resolveToWebsiteUrl(location);
  expect(result?.webLocation?.url).toBe("https://dx.pagopa.it/llms-full.txt");
});

it("returns dx.pagopa.it/llms.txt for llms.txt", () => {
  const location = {
    s3Location: {
      uri: "s3://bucket/llms.txt",
    },
    type: "S3" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
  };
  const result = resolveToWebsiteUrl(location);
  expect(result?.webLocation?.url).toBe("https://dx.pagopa.it/llms.txt");
});

it("returns dx.pagopa.it/blog/ for keys starting with /blog/", () => {
  const location = {
    s3Location: {
      uri: "s3://bucket/blog/some-post.md",
    },
    type: "S3" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
  };
  const result = resolveToWebsiteUrl(location);
  expect(result?.webLocation?.url).toBe("https://dx.pagopa.it/blog/");
});
import { describe, expect, it } from "vitest";

import { resolveToWebsiteUrl } from "../bedrock.js";

describe("resolveToWebsiteUrl", () => {
  it("converte una chiave S3 .md in url dx.pagopa.it/docs", () => {
    const location = {
      s3Location: {
        uri: "s3://bucket/azure/iam.md",
      },
      type: "S3" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
    };
    const result = resolveToWebsiteUrl(location);
    expect(result?.webLocation?.url).toBe(
      "https://dx.pagopa.it/docs/azure/iam",
    );
  });

  it("converte una chiave S3 index.md in url dx.pagopa.it/docs con slash finale", () => {
    const location = {
      s3Location: {
        uri: "s3://bucket/pipelines/index.md",
      },
      type: "S3" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
    };
    const result = resolveToWebsiteUrl(location);
    expect(result?.webLocation?.url).toBe(
      "https://dx.pagopa.it/docs/pipelines/",
    );
  });

  it("ignora location non S3", () => {
    const location = {
      type: "WEB" as import("@aws-sdk/client-bedrock-agent-runtime").RetrievalResultLocationType,
      webLocation: {
        url: "https://example.com",
      },
    };
    const result = resolveToWebsiteUrl(location);
    expect(result?.webLocation?.url).toBe("https://example.com");
  });

  it("restituisce undefined se location è undefined", () => {
    expect(resolveToWebsiteUrl(undefined)).toBeUndefined();
  });
});
