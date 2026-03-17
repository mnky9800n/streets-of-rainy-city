#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# assemble-enemy-sprites.sh
#
# Assembles individual enemy pose PNGs into sprite sheets for one or both
# enemy variants (enemy-thug-male, enemy-thug-female).
#
# Usage:
#   ./assemble-enemy-sprites.sh [male|female|both]   (default: both)
#
# Pipeline per variant:
#   1. rembg (u2net_human_seg) — AI background removal; preserves white clothing
#   2. magick resize — scale to 256px tall, maintain aspect ratio
#   3. magick pad + +append — uniform frame size, horizontal concatenation
# ---------------------------------------------------------------------------

VARIANT="${1:-both}"

# Resolve the repo root from this script's location so the script works
# regardless of the caller's working directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
SPRITES_ROOT="$REPO_ROOT/public/sprites"

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
    local padded="/tmp/enemy_padded_${i}.png"
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
# Helper: process one variant (male or female).
# ---------------------------------------------------------------------------
process_variant() {
  local variant="$1"   # "male" or "female"
  local name="enemy-thug-${variant}"
  local poses_dir="$SPRITES_ROOT/${name}/poses"
  local out_dir="$SPRITES_ROOT/${name}"
  local transparent_dir="${poses_dir}/transparent"
  local resized_dir="${poses_dir}/resized"

  echo ""
  echo "========================================================"
  echo "  Processing variant: ${name}"
  echo "========================================================"

  if [ ! -d "$poses_dir" ]; then
    echo "ERROR: poses directory not found: $poses_dir" >&2
    exit 1
  fi

  mkdir -p "$transparent_dir"
  mkdir -p "$resized_dir"

  # -------------------------------------------------------------------------
  # Step 1: Remove backgrounds with rembg (u2net_human_seg).
  # Flood-fill is intentionally NOT used here — it destroys white clothing.
  # -------------------------------------------------------------------------
  echo ""
  echo "=== Step 1: Remove backgrounds (rembg u2net_human_seg) ==="
  for f in "$poses_dir"/*.png; do
    local fname
    fname=$(basename "$f")
    # Skip files inside subdirectories that glob may surface
    echo "  rembg: $fname"
    uv run --with "rembg[cli,cpu]" rembg i -m u2net_human_seg "$f" "$transparent_dir/$fname"
  done

  # -------------------------------------------------------------------------
  # Step 2: Resize to 256px tall (maintain aspect ratio).
  # This normalises frames before the max-dimension calculation in Step 3,
  # preventing outsized frames from inflating the sheet height.
  # -------------------------------------------------------------------------
  echo ""
  echo "=== Step 2: Resize frames to 256px tall ==="
  for f in "$transparent_dir"/*.png; do
    local fname
    fname=$(basename "$f")
    echo "  resize: $fname"
    magick "$f" -resize "x256" "$resized_dir/$fname"
  done

  # -------------------------------------------------------------------------
  # Step 3: Assemble sprite sheets.
  # -------------------------------------------------------------------------
  echo ""
  echo "=== Step 3: Assemble sprite sheets ==="

  local R="$resized_dir"

  echo ""
  echo "--- Idle (6 frames) ---"
  assemble_sheet "$out_dir/${name}-idle.png" \
    "$R/idle-01.png" "$R/idle-02.png" "$R/idle-03.png" \
    "$R/idle-04.png" "$R/idle-05.png" "$R/idle-06.png"

  echo ""
  echo "--- Walk (8 frames) ---"
  assemble_sheet "$out_dir/${name}-walk.png" \
    "$R/walk-01.png" "$R/walk-02.png" "$R/walk-03.png" "$R/walk-04.png" \
    "$R/walk-05.png" "$R/walk-06.png" "$R/walk-07.png" "$R/walk-08.png"

  echo ""
  echo "--- Punch (6 frames) ---"
  assemble_sheet "$out_dir/${name}-punch.png" \
    "$R/punch-01.png" "$R/punch-02.png" "$R/punch-03.png" \
    "$R/punch-04.png" "$R/punch-05.png" "$R/punch-06.png"

  echo ""
  echo "--- Hit (4 frames) ---"
  assemble_sheet "$out_dir/${name}-hit.png" \
    "$R/hit-01.png" "$R/hit-02.png" "$R/hit-03.png" "$R/hit-04.png"

  echo ""
  echo "--- Knockback (6 frames) ---"
  assemble_sheet "$out_dir/${name}-knockback.png" \
    "$R/knockback-01.png" "$R/knockback-02.png" "$R/knockback-03.png" \
    "$R/knockback-04.png" "$R/knockback-05.png" "$R/knockback-06.png"

  echo ""
  echo "--- Death (8 frames) ---"
  assemble_sheet "$out_dir/${name}-death.png" \
    "$R/death-01.png" "$R/death-02.png" "$R/death-03.png" "$R/death-04.png" \
    "$R/death-05.png" "$R/death-06.png" "$R/death-07.png" "$R/death-08.png"

  echo ""
  echo "=== All sprite sheets assembled for ${name} ==="
  ls -lh "$out_dir"/*.png
}

# ---------------------------------------------------------------------------
# Dispatch based on variant argument.
# ---------------------------------------------------------------------------
case "$VARIANT" in
  male)
    process_variant "male"
    ;;
  female)
    process_variant "female"
    ;;
  both)
    process_variant "male"
    process_variant "female"
    ;;
  *)
    echo "Usage: $(basename "$0") [male|female|both]" >&2
    echo "  Defaults to 'both' when no argument is given." >&2
    exit 1
    ;;
esac

echo ""
echo "Done."
