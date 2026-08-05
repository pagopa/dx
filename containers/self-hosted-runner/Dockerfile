
# === Stage 1: Use base Runner and install tools ===
ARG RUNNER_DIGEST=sha256:3f06bf70688f9d314884d5bde3e7403eaea257d9a5120a635f4b7788d3411bf2

FROM ghcr.io/actions/actions-runner${RUNNER_DIGEST:+@${RUNNER_DIGEST}} AS base

ARG RUNNER_DIGEST
ARG MISE_VERSION=2026.8.1
ARG MISE_SHA256=961b1fcc78830e861ab887abd19d9b961478bcf252e37881fdd61c81388308d4

LABEL base_runner_digest=${RUNNER_DIGEST}

ENV MISE_DATA_DIR=/home/runner/.local/share/mise
ENV PATH="${MISE_DATA_DIR}/bin:${PATH}"

USER root
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
    > /etc/apt/apt.conf.d/80network-retries && \
    apt-get update && apt-get install -y --no-install-recommends \
    zip wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# === Stage 2: Install mise ===
FROM base AS mise
ARG MISE_VERSION
ARG MISE_SHA256
RUN install -d -o runner -g runner -m 0755 \
        "${MISE_DATA_DIR}" \
        "${MISE_DATA_DIR}/bin" \
        /home/runner/.local/share/aube \
        /home/runner/.local/share/gh \
        /home/runner/.local/state/mise \
        /home/runner/.config/mise \
        /home/runner/.cache/mise \
        /home/runner/.cache/node
RUN curl --fail --location --retry 5 --retry-all-errors --connect-timeout 30 \
        "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-x64" \
        --output "${MISE_DATA_DIR}/bin/mise" && \
    echo "${MISE_SHA256}  ${MISE_DATA_DIR}/bin/mise" | sha256sum --check --strict && \
    chmod +x "${MISE_DATA_DIR}/bin/mise"

# === Final Stage ===
FROM mise AS final

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner

RUN openssl version && \
    mise --version && \
    test -s ./run.sh && \
    test -s ./externals/node24/bin/node && \
    ./externals/node24/bin/node --version

ENTRYPOINT ["/entrypoint.sh"]
