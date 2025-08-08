#!/usr/bin/env bash

set -e

curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin

echo "Syft installed successfully!"
