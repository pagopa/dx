FROM public.ecr.aws/docker/library/node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14

# This PoC copies only the Nx-pruned output into Docker and installs runtime
# dependencies in-container so native packages match the target architecture.

RUN corepack enable

WORKDIR /app

COPY dist ./dist

WORKDIR /app/dist

# Install from the pruned payload rather than from the monorepo root.
# The explicit cleanup keeps the final image close to the runtime-only payload
# instead of shipping the temporary pnpm store and pruning metadata.
RUN pnpm install --prod --no-frozen-lockfile && \
	pnpm store prune && \
	rm -rf /root/.local/share/pnpm/store workspace_modules pnpm-lock.yaml pnpm-workspace.yaml

WORKDIR /app

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1@sha256:46d6625e68cbbdd2efab4a20245977664513f13ffef47915b000d431adcea0b4 /lambda-adapter /opt/extensions/lambda-adapter

EXPOSE 8080
CMD ["node", "dist/cli.js"]
