#!/usr/bin/env bash
set -euo pipefail

docker run --rm --detach \
  --name falco \
  --privileged \
  -v /tmp:/tmp \
  -v /var/run/docker.sock:/host/var/run/docker.sock \
  -v /proc:/host/proc:ro \
  -v /etc:/host/etc:ro \
  -v "$RUNNER_TEMP/falco_cicd_rules.yaml:/etc/falco/rules.d/custom_rules.yaml:ro" \
  falcosecurity/falco@sha256:1562a643953f938e02f47319b5214d93a235f11f646d60e9b8a516fd5a64698e \
  falco -o "json_output=true" -o "file_output.enabled=true" \
  -o "file_output.keep_alive=false" -o "file_output.filename=/tmp/falco_events.json" \
  -o "engine.kind=modern_ebpf" -o "webserver.listen_address=127.0.0.1"

for ((attempt = 1; attempt <= 60; attempt++)); do
  if ! docker inspect falco --format '{{.State.Running}}' 2>/dev/null | grep -qx true; then
    echo "::error::Falco stopped before monitoring was ready."
    exit 1
  fi

  if docker exec falco curl --fail --silent --max-time 2 http://127.0.0.1:8765/reload 2>/dev/null |
    jq -e '.ready == true' > /dev/null; then
    echo "Falco is ready to monitor events."
    exit 0
  fi

  sleep 1
done

echo "::error::Falco did not become ready within 60 attempts."
docker stop falco > /dev/null
exit 1
