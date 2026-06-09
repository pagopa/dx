import { describe, expect, it } from "vitest";

import { maskOutput } from "../mask-output.js";

describe("maskOutput", () => {
  it("ports the private key masking case from sanitize-terraform-plan", () => {
    const input = `Test mode enabled.
--- Executing Plan ---
PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-CONTENT-----END PRIVATE KEY-----"`;

    const expected = `Test mode enabled.
--- Executing Plan ---
PRIVATE_KEY = "[REDACTED]"`;

    expect(maskOutput(input, ["hidden-link", " test-sensible-key"])).toBe(
      expected,
    );
  });

  it("ports the built-in secret key masking case from sanitize-terraform-plan", () => {
    const input = `Test mode enabled.
--- Executing Plan ---
password = "f75ea0e53e7bd57412e4b060e607f7"
Password = "75778f7425be4db0369d09af37a6bd57412e4b060e607f7"
PASSWORD = "5778f746c2b9a83dea0e53e7bd57412e4b060e607f7"
DBPassword = "78f7425be4db0369d09af37a6"

apiKey = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
api_key = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3c"
testAPIKey = "5994471abb011174b4f511b99806da59b3caf5a9c173cacfc5"

AccessKey = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
AccountKey = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
Password = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
secret = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
SecretToken = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
AuthToken = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
auth_token = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
access_key = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"
connection_string = "2afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"`;

    const expected = `Test mode enabled.
--- Executing Plan ---
password = "[REDACTED]"
Password = "[REDACTED]"
PASSWORD = "[REDACTED]"
DBPassword = "[REDACTED]"

apiKey = "[REDACTED]"
api_key = "[REDACTED]"
testAPIKey = "[REDACTED]"

AccessKey = "[REDACTED]"
AccountKey = "[REDACTED]"
Password = "[REDACTED]"
secret = "[REDACTED]"
SecretToken = "[REDACTED]"
AuthToken = "[REDACTED]"
auth_token = "[REDACTED]"
access_key = "[REDACTED]"
connection_string = "[REDACTED]"`;

    expect(maskOutput(input, ["hidden-link", " test-sensible-key"])).toBe(
      expected,
    );
  });

  it("ports the custom sensitive key masking case from sanitize-terraform-plan", () => {
    const input = `Test mode enabled.
--- Executing Plan ---
normal_value = "Keep Me"

hidden-link = "http://sensitive_test.link"
hidden-links = "http://non_sensitive_test.link"
very-hidden-link = "http://non_sensitive_test.link"

hiddden-link = "http://non_sensitive_test.link"

hidden-link: /app-insights-conn-string         = "InstrumentationKey=000000-000000-000000-000000;IngestionEndpoint=https://westeurope-3.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/;ApplicationId=000000-000000-000000-000000"
hidden-link: /app-insights-instrumentation-key = "000000-000000-000000-000000"
hidden-link: /app-insights-resource-id         = "/subscriptions/***/resourceGroups/XXXXX/providers/microsoft.insights/components/XXXXX"
hidden-link: /changed-resource-id              = "/subscriptions/***/resourceGroups/XXXXX/providers/microsoft.insights/components/XXXXX" -> "/subscriptions/***/resourceGroups/XXXXX/providers/microsoft.insights/components/YYYYY"

test-sensible-key       = "test"
test-super-sensible-key = "test"
sensible-key            = "test"
hide-test-sensible-key  = "test"
test-sensible-key-hide  = "test"`;

    const expected = `Test mode enabled.
--- Executing Plan ---
normal_value = "Keep Me"

hidden-link = "[REDACTED]"
hidden-links = "[REDACTED]"
very-hidden-link = "[REDACTED]"

hiddden-link = "http://non_sensitive_test.link"

hidden-link: /app-insights-conn-string         = "[REDACTED]"
hidden-link: /app-insights-instrumentation-key = "[REDACTED]"
hidden-link: /app-insights-resource-id         = "[REDACTED]"
hidden-link: /changed-resource-id              = "[REDACTED]" -> "[REDACTED]"

test-sensible-key       = "[REDACTED]"
test-super-sensible-key = "test"
sensible-key            = "test"
hide-test-sensible-key  = "[REDACTED]"
test-sensible-key-hide  = "[REDACTED]"`;

    expect(maskOutput(input, ["hidden-link", " test-sensible-key"])).toBe(
      expected,
    );
  });
});
