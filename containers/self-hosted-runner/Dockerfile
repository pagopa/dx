
# === Stage 1: Install runner dependencies and mise ===
ARG RUNNER_DIGEST=sha256:3f06bf70688f9d314884d5bde3e7403eaea257d9a5120a635f4b7788d3411bf2

FROM ghcr.io/actions/actions-runner${RUNNER_DIGEST:+@${RUNNER_DIGEST}} AS mise

ARG RUNNER_DIGEST
ARG MISE_VERSION=2026.8.1
ARG MISE_SHA256=961b1fcc78830e861ab887abd19d9b961478bcf252e37881fdd61c81388308d4

LABEL base_runner_digest=${RUNNER_DIGEST}

ENV MISE_DATA_DIR=/home/runner/.local/share/mise
ENV PATH="${MISE_DATA_DIR}/shims:${MISE_DATA_DIR}/bin:${PATH}"

USER root
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
    > /etc/apt/apt.conf.d/80network-retries && \
    apt-get update && apt-get install -y --no-install-recommends \
    zip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Keep ownership scoped to the state and cache paths used by mise backends and
# workflow setup actions instead of making the runner home broadly writable.
RUN install -d -o runner -g runner -m 0755 \
        "${MISE_DATA_DIR}" \
        "${MISE_DATA_DIR}/bin" \
        /home/runner/.local/share/aube \
        /home/runner/.local/share/gh \
        /home/runner/.local/state/mise \
        /home/runner/.config/mise \
        /home/runner/.cache/mise \
        /home/runner/.cache/node \
        /home/runner/.cache/rosetta \
        /home/runner/.cache/sigstore-rust \
        /home/runner/.cache/uv
RUN curl --fail --location --retry 5 --retry-all-errors --connect-timeout 30 \
        "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-x64" \
        --output "${MISE_DATA_DIR}/bin/mise" && \
    echo "${MISE_SHA256}  ${MISE_DATA_DIR}/bin/mise" | sha256sum --check --strict && \
    chmod +x "${MISE_DATA_DIR}/bin/mise"

# === Final Stage ===
FROM mise AS final

COPY entrypoint.sh /entrypoint.sh
COPY --chown=runner:runner mise.toml /home/runner/mise.toml
RUN chmod +x /entrypoint.sh

USER runner

RUN set -eux; \
    cd /home/runner; \
    mise trust mise.toml; \
    mise install; \
    mise ls --current

RUN set -eux; \
    cd /home/runner; \
    openssl version; \
    mise --version; \
    mise exec -- aws --version; \
    mise exec -- az version; \
    mise exec -- uv --version

RUN set -eux; \
    cd /home/runner; \
    test -s ./run.sh; \
    test -s ./externals/node24/bin/node; \
    ./externals/node24/bin/node --version

ENTRYPOINT ["/entrypoint.sh"]
