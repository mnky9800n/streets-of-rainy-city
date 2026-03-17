#!/usr/bin/env bash
# Generates all Jennifer sprite sheets for Streets of Rainy City.
# Run from the repo root: ./generate-jennifer-sprites.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
OPENAI_KEY="$(cat "${REPO_ROOT}/openaikey")"
OUT_DIR="${REPO_ROOT}/public/sprites/jennifer"
mkdir -p "${OUT_DIR}"

generate_sprite() {
  local name="$1"
  local prompt="$2"
  local out_path="${OUT_DIR}/${name}"

  echo "Generating ${name}..."

  RESPONSE=$(curl -s \
    -X POST "https://api.openai.com/v1/images/generations" \
    -H "Authorization: Bearer ${OPENAI_KEY}" \
    -H "Content-type: application/json" \
    -d "{
      \"model\": \"gpt-image-1\",
      \"n\": 1,
      \"prompt\": ${prompt},
      \"size\": \"1536x1024\",
      \"quality\": \"high\"
    }")

  B64=$(echo "$RESPONSE" | jq -r '.data[0].b64_json // empty')

  if [ -z "$B64" ]; then
    echo "  ERROR generating ${name}:" >&2
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE" >&2
    return 1
  fi

  echo "$B64" | base64 --decode > "${out_path}"
  echo "  Saved ${out_path}"
}

# ────────────────────────────────────────────────────────────────
# Shared character description used in every prompt
# ────────────────────────────────────────────────────────────────
# Jennifer: young woman, long wavy blonde hair, blue eyes,
# white low-cut top with blue suspender/tie, brown leather belt,
# black denim shorts with frayed hem, black lace-up combat boots,
# white ankle socks, gold brass-knuckle wrist guards on both fists.
# Art style: illustrated beat-em-up arcade (King of Fighters /
# Streets of Rage style), clean linework, flat colors with subtle
# cel-shading. Side-view facing RIGHT. White background.
# ────────────────────────────────────────────────────────────────

BASE_CHAR='Jennifer: young woman fighter, long wavy blonde hair, blue eyes, white low-cut top with blue suspender tie, brown leather belt, black denim shorts frayed hem, black lace-up combat boots, white ankle socks, gold brass-knuckle wrist guards. Illustrated beat-em-up arcade art style like King of Fighters or Streets of Rage, clean linework, flat colors with cel-shading. Side-view character facing right. White background. All frames same character same proportions same outfit.'

# ────────────────────────────────────────────────────────────────
# 1. IDLE — 6 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-idle.png" \
  "\"Sprite sheet: ${BASE_CHAR} IDLE animation, 6 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Fighting stance, subtle breathing cycle: chest rises and falls, slight weight shift from foot to foot, fists stay up in guard. Frame 1: neutral guard stance. Frame 2-3: slight inhale, body rises a few pixels. Frame 4: exhale, body lowers. Frame 5-6: weight shifts to other foot. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 2. WALK — 8 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-walk.png" \
  "\"Sprite sheet: ${BASE_CHAR} WALK animation, 8 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Walking cycle facing right, arms slightly swinging at sides in loose guard, determined stride. Classic 8-frame walk cycle: contact, down, passing, up repeated twice (left then right lead foot). Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 3. PUNCH COMBO — 12 frames (4 frames x 3 hits), horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-punch.png" \
  "\"Sprite sheet: ${BASE_CHAR} PUNCH COMBO animation, 12 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Three-hit combo: Hit 1 (frames 1-4): quick left jab — wind up, extend left fist forward, fully extended, retract. Hit 2 (frames 5-8): right cross — pivot body, extend right fist with rotation, full cross extension, retract. Hit 3 (frames 9-12): powerful finisher uppercut — crouch down, explosive upward punch motion, peak of uppercut with slight jump, land back in stance. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 4. JUMP — 4 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-jump.png" \
  "\"Sprite sheet: ${BASE_CHAR} JUMP animation, 4 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Jump arc: Frame 1: crouch prep, knees bent, body lowered, arms down. Frame 2: launch, legs pushing off ground, body rising, arms up. Frame 3: apex of jump, legs tucked or extended, body at full height, hair flowing up. Frame 4: landing, knees bent absorbing impact, slight forward lean. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 5. JUMP KICK — 4 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-jumpkick.png" \
  "\"Sprite sheet: ${BASE_CHAR} JUMP KICK animation, 4 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Aerial kick: Frame 1: wind up in air, leg cocked back, body angled. Frame 2: kick extending forward and outward, boot thrusting toward right side of frame. Frame 3: kick fully extended, horizontal flying kick pose, both arms back for balance. Frame 4: leg retracting, preparing to land. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 6. HIT/DAMAGE — 4 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-hit.png" \
  "\"Sprite sheet: ${BASE_CHAR} HIT/DAMAGE animation, 4 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Recoil from being hit: Frame 1: impact moment, head snapping back or to the side, body twisting from impact. Frame 2: recoil peak, staggering backward, arms flailing. Frame 3: recovering, trying to regain balance, grimacing. Frame 4: back in stance, guard up, determined expression. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 7. KNOCKBACK — 6 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-knockback.png" \
  "\"Sprite sheet: ${BASE_CHAR} KNOCKBACK animation, 6 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Being knocked back and falling down: Frame 1: heavy hit impact, body lurching backward. Frame 2: stumbling backward, losing balance. Frame 3: falling backward, body nearly horizontal mid-fall. Frame 4: hitting the ground on back with impact. Frame 5: lying on ground, slightly dazed. Frame 6: starting to push self back up. Frames evenly spaced side by side on white background, no overlap.\""

# ────────────────────────────────────────────────────────────────
# 8. DEATH/KO — 8 frames, horizontal strip
# ────────────────────────────────────────────────────────────────
generate_sprite "jennifer-death.png" \
  "\"Sprite sheet: ${BASE_CHAR} DEATH/KO animation, 8 frames in a single horizontal row. Each frame is approximately 128 wide 200 tall. Knocked out and falling down defeated: Frame 1: final devastating hit, body jolting. Frame 2: going limp, legs buckling. Frame 3: crumpling downward, body folding. Frame 4: knees hitting ground. Frame 5: torso falling forward. Frame 6: sprawled on ground face-down or side. Frame 7: completely still on ground. Frame 8: final KO pose, completely defeated, lying still. Frames evenly spaced side by side on white background, no overlap.\""

echo ""
echo "All sprite sheets generated in ${OUT_DIR}"
ls -lh "${OUT_DIR}"
