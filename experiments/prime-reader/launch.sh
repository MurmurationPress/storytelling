#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ ! -f node_modules/epubjs/dist/epub.min.js ]; then
  npm ci --ignore-scripts --omit=dev
fi
python3 build_epub.py
exec npm start
