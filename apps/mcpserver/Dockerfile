FROM public.ecr.aws/docker/library/node:slim@sha256:c0eadb278e6b0b608681b359291592692979133567710eaa703d6f989f33c6c1 AS base

# 1. Enable pnpm
RUN corepack enable

# 2. Set working directory
WORKDIR /app

# 3. Copy monorepo configuration files
COPY ./pnpm-lock.yaml ./pnpm-workspace.yaml ./package.json ./

# 4. Copy source code for apps and packages
COPY ./apps ./apps
COPY ./packages ./packages


# 5. Install ALL dependencies for mcpserver and its workspace dependencies
RUN pnpm install --filter @pagopa/dx-mcpserver...
# 6. Build the mcpserver app
RUN pnpm --filter @pagopa/dx-mcpprompts build
RUN pnpm --filter @pagopa/dx-mcpserver build
# 7. Prune development-only dependencies for the final image
RUN pnpm --filter @pagopa/dx-mcpserver deploy --legacy --prod /app/deploy


# --- Final Image ---
FROM public.ecr.aws/docker/library/node:slim@sha256:c0eadb278e6b0b608681b359291592692979133567710eaa703d6f989f33c6c1
WORKDIR /app

# Copy the AWS Lambda Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1@sha256:46d6625e68cbbdd2efab4a20245977664513f13ffef47915b000d431adcea0b4 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the pruned production-ready files from the build stage
COPY --from=base /app/deploy .

EXPOSE 8080
CMD ["node", "dist/index.js"]
