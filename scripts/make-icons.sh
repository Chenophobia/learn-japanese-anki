#!/usr/bin/env bash
#
# Regenerates the app icons in static/ — a white あ on the app's indigo accent.
#
# macOS only, and deliberately so: it renders the glyph with the system's
# Hiragino Sans, which is what makes this a real あ rather than a hand-drawn
# approximation. The outputs are committed, so this only needs re-running when
# the mark itself changes.
#
#   ./scripts/make-icons.sh
#
# Requires: qlmanage + sips (system), python3 with Pillow (pip install pillow).
set -euo pipefail

cd "$(dirname "$0")/.."
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Full-bleed square. The rounded corners are applied afterwards in Pillow,
# because qlmanage composites an SVG's transparent corners onto white — which
# is invisible on a light background and a white block on a dark one.
cat > "$work/icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2c5282"/>
  <text x="256" y="262" fill="#ffffff"
        font-family="Hiragino Sans W6, Hiragino Sans, Hiragino Kaku Gothic ProN"
        font-size="300" text-anchor="middle" dominant-baseline="central">&#x3042;</text>
</svg>
SVG

qlmanage -t -s 512 -o "$work" "$work/icon.svg" >/dev/null 2>&1
test -f "$work/icon.svg.png" || { echo "qlmanage produced no thumbnail" >&2; exit 1; }

python3 - "$work/icon.svg.png" <<'PY'
import sys
from PIL import Image, ImageDraw

src = Image.open(sys.argv[1]).convert('RGB')

# apple-touch-icon must be an opaque square: iOS applies its own superellipse
# mask, and renders any transparency it finds as black.
src.resize((180, 180), Image.LANCZOS).save('static/apple-touch-icon.png')

# Favicons keep rounded corners. Mask drawn at 4x and downsampled, because
# ImageDraw does not antialias.
big = src.resize((2048, 2048), Image.LANCZOS)
mask = Image.new('L', (2048, 2048), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 2047, 2047], radius=456, fill=255)
big.putalpha(mask)

for size in (32, 192, 512):
    big.resize((size, size), Image.LANCZOS).save(f'static/favicon-{size}.png')

print('wrote apple-touch-icon.png, favicon-{32,192,512}.png')
PY
