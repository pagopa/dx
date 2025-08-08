#!/usr/bin/env bash

set -e

curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin

echo "Grype installed successfully!"
