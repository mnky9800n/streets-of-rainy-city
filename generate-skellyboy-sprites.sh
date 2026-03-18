#!/bin/bash
# Generate skellyboy 4-frame pedaling animation sprite sheet.
# Uses gpt-image-1 image edits endpoint with skellyboy.png as reference (one call per frame).
# Pipeline: API (lime green bg) -> rembg u2net -> numpy green-hue mask -> resize+pad+assemble.
set -euo pipefail

SCRIPT_DIR="/Users/mnky9800n/repos/streets-of-rainy-city"
API_KEY="$(cat "$SCRIPT_DIR/openaikey")"
REF_IMAGE="$SCRIPT_DIR/public/skellyboy.png"
OUT_DIR="$SCRIPT_DIR/public/sprites/delivery-enemy"
POSES_DIR="$OUT_DIR/poses"
FINAL_SHEET="$OUT_DIR/delivery-enemy-ride.png"

mkdir -p "$POSES_DIR"

generate_frame() {
  local FRAME_NUM="$1"
  local PEDAL_DESC="$2"
  local OUT_RAW="$POSES_DIR/skellyboy-raw-frame-${FRAME_NUM}.png"

  echo "  Generating frame ${FRAME_NUM}..."

  local PROMPT="A single cartoon skeleton bicycle rider, side view, facing LEFT (front wheel on the LEFT side, rear wheel on the RIGHT side). Reproduce this exact character: white skeleton bones with black outlines, wearing a red-orange cycling helmet, riding an orange road bicycle with black wheels and visible spokes, orange insulated delivery backpack (Grubhub-branded). The bicycle is COMPLETELY FLAT AND HORIZONTAL — both wheels touch the same ground line. SOLID BRIGHT LIME GREEN BACKGROUND — no gradient, no shadows, no ground. Full character visible from head to wheels, nothing cropped. Single character only — do NOT show multiple copies. Pedal position: ${PEDAL_DESC}"

  local RESPONSE
  RESPONSE=$(curl -s https://api.openai.com/v1/images/edits \
    -H "Authorization: Bearer $API_KEY" \
    -F "model=gpt-image-1" \
    -F "image[]=@$REF_IMAGE;type=image/png" \
    -F "prompt=$PROMPT" \
    -F "size=1024x1536" \
    -F "quality=high" \
    -F "n=1")

  local ERR
  ERR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || true)
  if [ -n "$ERR" ]; then
    echo "  ERROR from API for frame ${FRAME_NUM}: $ERR"
    return 1
  fi

  echo "$RESPONSE" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
items = d.get('data', [])
if not items:
    print('ERROR: No data in response'); sys.exit(1)
item = items[0]
if 'b64_json' in item:
    img_data = base64.b64decode(item['b64_json'])
    with open('$OUT_RAW', 'wb') as f:
        f.write(img_data)
    print(f'  Saved {len(img_data)} bytes')
else:
    print('ERROR: no b64_json'); sys.exit(1)
"
}

echo "=== Step 1: Generating 4 frames individually ==="

generate_frame 1 "RIGHT pedal at 6 o'clock (straight down), right leg fully extended. LEFT pedal at 12 o'clock, left knee raised high."
generate_frame 2 "RIGHT pedal at 3 o'clock (pointing forward), LEFT pedal at 9 o'clock (pointing back). Both legs at mid-height."
generate_frame 3 "LEFT pedal at 6 o'clock (straight down), left leg fully extended. RIGHT pedal at 12 o'clock, right knee raised high."
generate_frame 4 "LEFT pedal at 9 o'clock (pointing back), RIGHT pedal at 3 o'clock (pointing forward). Both legs at mid-height."

echo ""
echo "=== Step 2: Background removal (rembg + numpy green mask) ==="

# Step 2a: rembg for outer silhouette
for i in 1 2 3 4; do
  echo "  rembg frame $i..."
  uv run --with "rembg[cli,cpu]" rembg i -m u2net \
    "$POSES_DIR/skellyboy-raw-frame-${i}.png" \
    "$POSES_DIR/skellyboy-nobg-frame-${i}.png" 2>/dev/null
done

# Step 2b: numpy green-hue mask for spoke interiors rembg misses
# Background green varies slightly per frame (srgb ~135,220,68 to srgb ~134,233,94)
# Mask: G>150, G>R*1.3, G>B*2.3 — safe since character has no green in orange/white/black palette
uv run --with pillow --with numpy python3 - <<'PYEOF'
from PIL import Image
import numpy as np

for i in range(1, 5):
    path = f"/Users/mnky9800n/repos/streets-of-rainy-city/public/sprites/delivery-enemy/poses/skellyboy-nobg-frame-{i}.png"
    img = Image.open(path).convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b, a = data[...,0], data[...,1], data[...,2], data[...,3]
    green_mask = (g > 150) & (g > r * 1.3) & (g > b * 2.3) & (a > 10)
    data[..., 3] = np.where(green_mask, 0, data[..., 3])
    Image.fromarray(data.astype(np.uint8), "RGBA").save(path)
    print(f"  Frame {i}: removed {int(green_mask.sum())} green pixels")
PYEOF

echo ""
echo "=== Step 3: Resize to 256px tall ==="

for i in 1 2 3 4; do
  magick "$POSES_DIR/skellyboy-nobg-frame-${i}.png" -resize "x256" "$POSES_DIR/ride-resized-0${i}.png"
  W=$(magick identify -format "%w" "$POSES_DIR/ride-resized-0${i}.png")
  echo "  Frame $i: ${W}x256"
done

echo ""
echo "=== Step 4: Pad to uniform width ==="

MAX_W=0
for i in 1 2 3 4; do
  W=$(magick identify -format "%w" "$POSES_DIR/ride-resized-0${i}.png")
  [ "$W" -gt "$MAX_W" ] && MAX_W=$W
done
echo "Max width: ${MAX_W}px"

for i in 1 2 3 4; do
  magick "$POSES_DIR/ride-resized-0${i}.png" \
    -gravity Center -background transparent -extent "${MAX_W}x256" \
    "$POSES_DIR/ride-0${i}.png"
done

echo ""
echo "=== Step 5: Assemble final sprite sheet ==="

# Note: 'magick +append' is broken in this IM7 build; use 'magick convert +append'
magick convert +append \
  "$POSES_DIR/ride-01.png" \
  "$POSES_DIR/ride-02.png" \
  "$POSES_DIR/ride-03.png" \
  "$POSES_DIR/ride-04.png" \
  "$FINAL_SHEET"

W=$(magick identify -format "%w" "$FINAL_SHEET")
H=$(magick identify -format "%h" "$FINAL_SHEET")
echo "Final sheet: ${W}x${H}"
echo "Saved: $FINAL_SHEET"
