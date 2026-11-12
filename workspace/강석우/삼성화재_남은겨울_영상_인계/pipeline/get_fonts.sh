#!/bin/sh
# get_fonts.sh - downloads Pretendard (SIL Open Font License 1.1, github.com/orioncactus/pretendard) from npm into fonts/.
# The font files are not kept in the repo (binary, ~0.8MB each); run this once before rendering.
set -e
cd "$(dirname "$0")"
T=$(mktemp -d); mkdir -p fonts
(cd "$T" && npm pack pretendard@1.3.9 --silent >/dev/null && tar xzf pretendard-*.tgz)
for w in Light Regular Medium SemiBold Bold ExtraBold Black; do cp "$T/package/dist/web/static/woff2/Pretendard-$w.woff2" fonts/; done
rm -rf "$T"; ls fonts
