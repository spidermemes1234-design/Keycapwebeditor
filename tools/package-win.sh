#!/bin/bash
# Builds the Windows app into out/Keycap Web Editor-win32-x64 (and a zip).
set -e
cd "$(dirname "$0")/.."
node tools/make-manifest.js "$(node -p "require('./app/version.json').version")" >/dev/null
rm -rf launcher/bundled-app && cp -r app launcher/bundled-app
npx --yes @electron/packager@18 launcher "Keycap Web Editor" --platform=win32 --arch=x64 \
  --electron-version=33.2.1 --out=out --overwrite --no-asar --prune=false \
  --app-copyright="Keycap Studios" --win32metadata.CompanyName="Keycap Studios" 2>&1 | tail -5
cd out && rm -f KeycapWebEditor-win.zip && zip -qr KeycapWebEditor-win.zip "Keycap Web Editor-win32-x64" && ls -la KeycapWebEditor-win.zip
