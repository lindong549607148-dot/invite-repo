#!/usr/bin/env bash
set -euo pipefail

npm install
NODE_ENV=production node src/server.js
