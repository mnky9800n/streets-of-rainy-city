#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# assemble-sprites.sh
#
# Assembles individual Jennifer pose PNGs into sprite sheets.
#
# Pipeline:
#   1. rembg (u2net_human_seg) — AI background removal; preserves white clothing
#   2. magick resize — scale to 256px tall, maintain aspect ratio
#   3. magick pad + +append — uniform frame size, horizontal concatenation
# ---------------------------------------------------------------------------

# Resolve the repo root from this script's location so the script works
# regardless of the caller's working directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
SPRITES_ROOT="$REPO_ROOT/public/sprites"

NAME="jennifer"
POSES_DIR="$SPRITES_ROOT/${NAME}/poses"
OUT_DIR="$SPRITES_ROOT/${NAME}"
TRANSPARENT_DIR="${POSES_DIR}/transparent"
RESIZED_DIR="${POSES_DIR}/resized"

# ---------------------------------------------------------------------------
# Helper: pad all frames to a uniform size and concatenate horizontally.
# Usage: assemble_sheet <output_path> <frame1> [frame2 ...]
# ---------------------------------------------------------------------------
assemble_sheet() {
  local output="$1"
  shift
  local frames=("$@")

  echo "  Computing max dimensions for $(basename "$output")..."

  local max_w=0
  local max_h=0

  for f in "${frames[@]}"; do
    local dims
    dims=$(magick identify -format "%wx%h" "$f")
    local w h
    w=$(echo "$dims" | cut -dx -f1)
    h=$(echo "$dims" | cut -dx -f2)
    if [ "$w" -gt "$max_w" ]; then max_w=$w; fi
    if [ "$h" -gt "$max_h" ]; then max_h=$h; fi
  done

  echo "  Max frame size: ${max_w}x${max_h}"

  local padded_frames=()
  local i=0
  for f in "${frames[@]}"; do
    local padded="/tmp/jennifer_padded_${i}.png"
    magick "$f" -gravity center -background none -extent "${max_w}x${max_h}" "$padded"
    padded_frames+=("$padded")
    i=$((i + 1))
  done

  magick "${padded_frames[@]}" +append "$output"
  echo "  Saved: $output"

  for p in "${padded_frames[@]}"; do
    rm -f "$p"
  done
}

# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

echo ""
echo "========================================================"
echo "  Processing: ${NAME}"
echo "========================================================"

if [ ! -d "$POSES_DIR" ]; then
  echo "ERROR: poses directory not found: $POSES_DIR" >&2
  exit 1
fi

mkdir -p "$TRANSPARENT_DIR"
mkdir -p "$RESIZED_DIR"

# -------------------------------------------------------------------------
# Step 1: Remove backgrounds with rembg (u2net_human_seg).
# Flood-fill is intentionally NOT used here — it destroys white clothing.
# -------------------------------------------------------------------------
echo ""
echo "=== Step 1: Remove backgrounds (rembg u2net_human_seg) ==="
for f in "$POSES_DIR"/*.png; do
  local_fname=$(basename "$f")
  echo "  rembg: $local_fname"
  uv run --with "rembg[cli,cpu]" rembg i -m u2net_human_seg "$f" "$TRANSPARENT_DIR/$local_fname"
done

# -------------------------------------------------------------------------
# Step 2: Resize to 256px tall (maintain aspect ratio).
# -------------------------------------------------------------------------
echo ""
echo "=== Step 2: Resize frames to 256px tall ==="
for f in "$TRANSPARENT_DIR"/*.png; do
  local_fname=$(basename "$f")
  echo "  resize: $local_fname"
  magick "$f" -resize "x256" "$RESIZED_DIR/$local_fname"
done

# -------------------------------------------------------------------------
# Step 3: Assemble sprite sheets.
# -------------------------------------------------------------------------
echo ""
echo "=== Step 3: Assemble sprite sheets ==="

R="$RESIZED_DIR"

echo ""
echo "--- Idle (6 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-idle.png" \
  "$R/idle-01.png" "$R/idle-02.png" "$R/idle-03.png" \
  "$R/idle-04.png" "$R/idle-05.png" "$R/idle-06.png"

echo ""
echo "--- Walk (8 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-walk.png" \
  "$R/walk-01.png" "$R/walk-02.png" "$R/walk-03.png" "$R/walk-04.png" \
  "$R/walk-05.png" "$R/walk-06.png" "$R/walk-07.png" "$R/walk-08.png"

echo ""
echo "--- Punch (12 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-punch.png" \
  "$R/punch-01.png" "$R/punch-02.png" "$R/punch-03.png" "$R/punch-04.png" \
  "$R/punch-05.png" "$R/punch-06.png" "$R/punch-07.png" "$R/punch-08.png" \
  "$R/punch-09.png" "$R/punch-10.png" "$R/punch-11.png" "$R/punch-12.png"

echo ""
echo "--- Jump (4 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-jump.png" \
  "$R/jump-01.png" "$R/jump-02.png" "$R/jump-03.png" "$R/jump-04.png"

echo ""
echo "--- Jump Kick (4 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-jumpkick.png" \
  "$R/jumpkick-01.png" "$R/jumpkick-02.png" "$R/jumpkick-03.png" "$R/jumpkick-04.png"

echo ""
echo "--- Hit (4 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-hit.png" \
  "$R/hit-01.png" "$R/hit-02.png" "$R/hit-03.png" "$R/hit-04.png"

echo ""
echo "--- Knockback (6 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-knockback.png" \
  "$R/knockback-01.png" "$R/knockback-02.png" "$R/knockback-03.png" \
  "$R/knockback-04.png" "$R/knockback-05.png" "$R/knockback-06.png"

echo ""
echo "--- Death (8 frames) ---"
assemble_sheet "$OUT_DIR/jennifer-death.png" \
  "$R/death-01.png" "$R/death-02.png" "$R/death-03.png" "$R/death-04.png" \
  "$R/death-05.png" "$R/death-06.png" "$R/death-07.png" "$R/death-08.png"

echo ""
echo "=== All sprite sheets assembled for ${NAME} ==="
ls -lh "$OUT_DIR"/*.png

echo ""
echo "Done."
