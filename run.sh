#!/usr/bin/env bash
set -euo pipefail

# Mirror Windows run.cmd: serve current directory on port 3000 with no cache
exec npx http-server -p 3000 -c-1

