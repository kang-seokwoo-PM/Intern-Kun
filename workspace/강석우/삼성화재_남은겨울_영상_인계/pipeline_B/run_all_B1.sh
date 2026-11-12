#!/bin/sh
# run_all_B1.sh <landing.html> [--music real_track.wav]
# B cut, full re-render in one go. Shares fonts / plates / logo / piano samples / snow with the v6 pipeline in ../pipeline/.
set -e
cd "$(dirname "$0")"
[ -n "$1" ] || { echo "usage: sh run_all_B1.sh <path to landing v8 .html> [--music track.wav]"; exit 1; }
HTML="$1"; shift
[ -f ../pipeline/fonts/Pretendard-Bold.woff2 ] || sh ../pipeline/get_fonts.sh
[ -f ../pipeline/assets/event_logo.png ] || node ../pipeline/make_logo_placeholder.js
python3 ../pipeline/prep_v6.py "$HTML"          # illustrations + bridge video stills -> ../pipeline/work/
python3 build_B1.py "$HTML"                     # copy is read from the landing; the two NEW lines are constants at the top of build_B1.py
mkdir -p work; node render_B1.js | tee work/render_B1.log
python3 assemble_B1.py "$@"                     # -> out/samsung_winters_16x9_B1.mp4
