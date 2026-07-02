FROM public.ecr.aws/docker/library/node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14

# This PoC copies only the Nx-pruned output into Docker and installs runtime
# dependencies in-container so native packages match the target architecture.

RUN corepack enable

WORKDIR /app

COPY dist .

# Align with the Nx guide layout: the pruned package.json, lockfile, compiled
# output, and workspace_modules all live directly under /app.
# Nx pruning already happened before the Docker build; pnpm store prune only
# removes the temporary pnpm cache so it is not shipped in the final image.
RUN pnpm install --prod --frozen-lockfile && \
	pnpm store prune && \
	rm -rf /root/.local/share/pnpm/store pnpm-lock.yaml pnpm-workspace.yaml

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1@sha256:46d6625e68cbbdd2efab4a20245977664513f13ffef47915b000d431adcea0b4 /lambda-adapter /opt/extensions/lambda-adapter

EXPOSE 8080
CMD ["node", "cli.js"]
