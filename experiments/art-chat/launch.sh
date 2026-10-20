#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ ! -f ../prime-reader/node_modules/epubjs/dist/epub.min.js ]; then
  npm ci --prefix ../prime-reader --ignore-scripts --omit=dev
fi
python3 build.py
export PORT="${PORT:-4190}"
printf 'Art preview: http://127.0.0.1:%s/?book=art\n' "$PORT"
exec node ../prime-reader/server.cjs
