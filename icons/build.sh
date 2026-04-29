#!/bin/bash
# Regenerate PNG icons from icon.svg using macOS sips.
# Usage: ./icons/build.sh
set -euo pipefail
cd "$(dirname "$0")"

for size in 16 32 48 128; do
  sips -s format png -z "$size" "$size" icon.svg --out "icon-${size}.png" >/dev/null
  echo "generated icon-${size}.png"
done
