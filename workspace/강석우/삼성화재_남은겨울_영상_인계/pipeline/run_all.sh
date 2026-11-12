#!/bin/sh
# run_all.sh <landing.html> [--music real_track.wav]
# Full re-render in one go: fonts -> plates -> page -> frames -> final mp4. Takes about 4 minutes.
set -e
cd "$(dirname "$0")"
[ -n "$1" ] || { echo "usage: sh run_all.sh <path to landing v8 .html> [--music track.wav]"; exit 1; }
HTML="$1"; shift
[ -f fonts/Pretendard-Bold.woff2 ] || sh get_fonts.sh
[ -f assets/event_logo.png ] || node make_logo_placeholder.js
python3 prep_v6.py "$HTML"
python3 build_v6.py "$HTML"
node render_v6.js | tee work/render_v6.log
python3 assemble_v6.py "$@"
