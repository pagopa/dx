FROM public.ecr.aws/docker/library/node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS base
# This PoC keeps the Dockerfile in charge of dependency installation and build
# so we can measure the caching impact of copying the whole workspace.
# 1. Enable pnpm
RUN corepack enable

# 2. Set working directory
WORKDIR /app

# 3. Copy the full workspace on purpose: any touched package can invalidate
#    the build cache, which is the behavior this PoC wants to expose.
COPY . .

# 4. Install the app plus every workspace package it consumes so Nx can build
#    the project from sources entirely inside the container.
RUN pnpm install --filter @pagopa/dx-mcpserver...

# 5. Materialize the production-only payload through the Nx task pipeline.
#    The package target depends on build, so Docker only needs a single Nx call.
RUN pnpm nx package @pagopa/dx-mcpserver

# --- Final Image ---
FROM public.ecr.aws/docker/library/node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14
WORKDIR /app

# Copy the AWS Lambda Adapter expected by the Lambda runtime.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1@sha256:46d6625e68cbbdd2efab4a20245977664513f13ffef47915b000d431adcea0b4 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the production payload prepared by the app-local packaging step.
COPY --from=base /app/apps/mcpserver/deploy .

EXPOSE 8080
CMD ["node", "dist/cli.js"]
