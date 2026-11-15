#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."

# Keep Latin/extended Latin, combining accents, punctuation, currency,
# arrows, math symbols, and geometric symbols. Preserve variable weights/hinting.
# The original TTFs remain untouched for the PDF CV.
for family in space-grotesk inconsolata; do
  pyftsubset "src/assets/fonts/${family}-variable.ttf" \
    --output-file="src/assets/fonts/${family}-variable.woff2" \
    --flavor=woff2 \
    --unicodes="U+0000-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-22FF,U+25A0-25FF,U+FFFD" \
    --layout-features='*' --notdef-outline --recommended-glyphs
done

# The website uses normal width only; retain the entire variable weight range.
fonttools varLib.instancer src/assets/fonts/inconsolata-variable.woff2 wdth=100 \
  --no-recalc-timestamp --output src/assets/fonts/inconsolata-variable.woff2
