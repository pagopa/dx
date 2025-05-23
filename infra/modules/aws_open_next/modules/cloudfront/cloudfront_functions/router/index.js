import cf from "cloudfront";

/*
 * CloudFront Router Function
 *
 * Purpose: Intercepts requests where the host header starts with pr-***, rewrites and routes them to the correct preview environment.
 * For all other requests, it modifies the header x-forwarded-host and returns the request.
 */
async function handler(event) {
  var request = event.request;
  // Extract the host header
  const host = request.headers.host && request.headers.host.value;
  // Match host header starting with pr-***
  const previewPrMatch = host && host.match(/^(pr-\d+)\./);
  if (previewPrMatch) {
    const prAlias = previewPrMatch[1];
    // Retrieve the function URL from the KV store
    const functionUrl = await cf.kvs().get("pr-alias:" + prAlias);
    if (functionUrl) {
      const origin = {
        domainName: functionUrl,
        customOriginConfig: {
          port: 443,
          protocol: "https",
          sslProtocols: ["TLSv1.2"],
        },
        originAccessControlConfig: {
          enabled: true,
          signingBehavior: "always",
          signingProtocol: "sigv4",
          originType: "lambda"
        }
      };
      cf.updateRequestOrigin(origin);
      request.headers['cache-control'] = { value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' };
      request.headers['pragma'] = { value: 'no-cache' };
      request.headers['expires'] = { value: '0' };
      request.headers["x-forwarded-host"] = request.headers.host;
      return request;
    }
    // If not found, return 404
    event.response = {
      statusCode: 404,
      statusDescription: "Not Found",
      body: {
        encoding: "text",
        data: "Preview environment for " + prAlias + " not found."
      }
    };
    return event.response;
  }

  // For all other requests, just modify the header x-forwarded-host
  request.headers["x-forwarded-host"] = request.headers.host;
  return request;
}
