/**
 * Boot the shared local topology once for backend integration and characterization suites.
 */
import { startBackendTestServer } from "./support/backend-test-server.js";
import { startSharedTestcontainers } from "./support/shared-testcontainers.js";

export default async function globalSetup() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const [backendServer, sharedContainers] = await Promise.all([
    startBackendTestServer(),
    startSharedTestcontainers(),
  ]);

  process.env.AZURE_TRACING_TEST_COSMOS_ENDPOINT = sharedContainers.cosmosEndpoint;
  process.env.AZURE_TRACING_TEST_COSMOS_KEY = sharedContainers.cosmosKey;
  process.env.AZURE_TRACING_TEST_INGESTION_ENDPOINT =
    backendServer.ingestionEndpoint;
  process.env.AZURE_TRACING_TEST_OUTBOUND_URL = backendServer.outboundUrl;
  process.env.AZURE_TRACING_TEST_REDIS_URL = sharedContainers.redisUrl;
  process.env.AZURE_TRACING_TEST_STUB_BASE_URL = backendServer.baseUrl;

  return async () => {
    await sharedContainers.stop();
    await backendServer.stop();
  };
}
