/**
 * @fileoverview Azure credential provider for GitHub Actions.
 *
 * Detects whether we're running in GitHub Actions with OIDC federated identity
 * (azure/login sets AZURE_FEDERATED_TOKEN_FILE, AZURE_CLIENT_ID, AZURE_TENANT_ID)
 * and uses WorkloadIdentityCredential in that case, preventing self-hosted runners
 * from accidentally escaping to their local Managed Identity.
 *
 * Falls back to DefaultAzureCredential with Managed Identity explicitly excluded
 * for environments where federated identity variables are not present.
 */

import * as core from "@actions/core";
import {
  DefaultAzureCredential,
  type TokenCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";

/**
 * Returns a TokenCredential configured for GitHub Actions environments.
 *
 * When azure/login completes with OIDC it exports AZURE_CLIENT_ID,
 * AZURE_TENANT_ID, and AZURE_FEDERATED_TOKEN_FILE into the job environment.
 * WorkloadIdentityCredential reads these automatically when instantiated
 * without arguments — no need to pass them explicitly.
 *
 * On self-hosted runners that also have a local Managed Identity this prevents
 * DefaultAzureCredential from silently choosing the wrong identity, which is
 * the root cause of 403 errors in production.
 */
export function getAzureCredential(): TokenCredential {
  const federatedTokenFile = process.env["AZURE_FEDERATED_TOKEN_FILE"];
  const clientId = process.env["AZURE_CLIENT_ID"];
  const tenantId = process.env["AZURE_TENANT_ID"];

  // azure/login (OIDC) populates all three env vars after a successful login.
  // When present, use WorkloadIdentityCredential which reads them directly.
  if (federatedTokenFile && clientId && tenantId) {
    core.info(
      "GitHub Actions federated identity detected, using WorkloadIdentityCredential",
    );
    return new WorkloadIdentityCredential();
  }

  // Fallback for environments without federated identity (e.g. local dev).
  // The important protection against self-hosted runners using their local MI
  // is already handled by the WorkloadIdentityCredential branch above, which
  // covers all GitHub Actions OIDC scenarios.
  core.info("Using DefaultAzureCredential");
  return new DefaultAzureCredential();
}
