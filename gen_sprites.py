#!/usr/bin/env python3
"""Generate all Jennifer sprite sheets via OpenAI image API."""

import json
import base64
import urllib.request
import urllib.error
import os
import sys

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(REPO_ROOT, "public", "sprites", "jennifer")
os.makedirs(OUT_DIR, exist_ok=True)

with open(os.path.join(REPO_ROOT, "openaikey")) as f:
    API_KEY = f.read().strip()

BASE_CHAR = (
    "Jennifer: young woman fighter, long wavy blonde hair, blue eyes, "
    "white low-cut top with blue suspender tie, brown leather belt, "
    "black denim shorts frayed hem, black lace-up combat boots, white ankle socks, "
    "gold brass-knuckle wrist guards on both fists. "
    "Illustrated beat-em-up arcade art style like King of Fighters or Streets of Rage, "
    "clean linework, flat colors with cel-shading. "
    "Side-view character facing right. White background. "
    "All frames same character same proportions same outfit."
)

SPRITES = [
    (
        "jennifer-idle.png",
        f"Sprite sheet: {BASE_CHAR} "
        "IDLE animation, 6 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Fighting stance breathing cycle: chest rises and falls, slight weight shift foot to foot, fists in guard. "
        "Frame 1: neutral guard stance. Frames 2-3: slight inhale body rises. Frame 4: exhale body lowers. "
        "Frames 5-6: weight shifts to other foot. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-6 below each frame.",
    ),
    (
        "jennifer-walk.png",
        f"Sprite sheet: {BASE_CHAR} "
        "WALK animation, 8 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Walking cycle facing right, arms slightly swinging at sides in loose guard, determined stride. "
        "Classic 8-frame walk cycle: contact, down, passing, up repeated for left then right lead foot. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-8 below each frame.",
    ),
    (
        "jennifer-punch.png",
        f"Sprite sheet: {BASE_CHAR} "
        "PUNCH COMBO animation, 12 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Three-hit combo: "
        "Frames 1-4 quick left jab: wind up, extend left fist forward, fully extended, retract. "
        "Frames 5-8 right cross: pivot body, extend right fist with rotation, full cross, retract. "
        "Frames 9-12 finisher uppercut: crouch down, explosive upward punch, peak of uppercut, land in stance. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-12 below each frame.",
    ),
    (
        "jennifer-jump.png",
        f"Sprite sheet: {BASE_CHAR} "
        "JUMP animation, 4 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Frame 1: crouch prep, knees bent, body lowered, arms down. "
        "Frame 2: launch, legs pushing off, body rising, arms up. "
        "Frame 3: apex, legs tucked, body at full height, hair flowing. "
        "Frame 4: landing, knees bent absorbing impact, slight forward lean. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-4 below each frame.",
    ),
    (
        "jennifer-jumpkick.png",
        f"Sprite sheet: {BASE_CHAR} "
        "JUMP KICK animation, 4 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Aerial kick sequence: "
        "Frame 1: wind up in air, leg cocked back, body angled. "
        "Frame 2: kick extending forward, boot thrusting to right. "
        "Frame 3: kick fully extended, horizontal flying kick, arms back for balance. "
        "Frame 4: leg retracting, preparing to land. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-4 below each frame.",
    ),
    (
        "jennifer-hit.png",
        f"Sprite sheet: {BASE_CHAR} "
        "HIT DAMAGE RECOIL animation, 4 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Frame 1: impact moment, head snapping back, body twisting from punch. "
        "Frame 2: recoil peak, staggering backward, arms flailing. "
        "Frame 3: recovering, regaining balance, grimacing. "
        "Frame 4: back in guard stance, determined expression. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-4 below each frame.",
    ),
    (
        "jennifer-knockback.png",
        f"Sprite sheet: {BASE_CHAR} "
        "KNOCKBACK FALL animation, 6 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Frame 1: heavy hit impact, body lurching backward. "
        "Frame 2: stumbling backward, losing balance. "
        "Frame 3: falling backward, body nearly horizontal mid-fall. "
        "Frame 4: hitting ground on back with impact. "
        "Frame 5: lying on ground dazed. "
        "Frame 6: starting to push self back up. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-6 below each frame.",
    ),
    (
        "jennifer-death.png",
        f"Sprite sheet: {BASE_CHAR} "
        "DEATH KO animation, 8 frames in a single horizontal row. "
        "Each frame approximately 128 pixels wide and 200 pixels tall. "
        "Frame 1: final devastating hit, body jolting. "
        "Frame 2: going limp, legs buckling. "
        "Frame 3: crumpling downward. "
        "Frame 4: knees hitting ground. "
        "Frame 5: torso falling forward. "
        "Frame 6: sprawled on ground. "
        "Frame 7: completely still. "
        "Frame 8: final KO pose, fully defeated, lying still. "
        "Frames evenly spaced side by side on white background, no overlap, numbered 1-8 below each frame.",
    ),
]


def generate(name, prompt):
    out_path = os.path.join(OUT_DIR, name)
    print(f"Generating {name} ...", flush=True)

    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": "1536x1024",
        "quality": "high",
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} error for {name}: {body}", file=sys.stderr)
        return False

    b64 = data.get("data", [{}])[0].get("b64_json")
    if not b64:
        print(f"  No b64_json in response for {name}: {data}", file=sys.stderr)
        return False

    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))

    size_kb = os.path.getsize(out_path) // 1024
    print(f"  Saved {out_path} ({size_kb} KB)", flush=True)
    return True


failures = []
for sprite_name, sprite_prompt in SPRITES:
    success = generate(sprite_name, sprite_prompt)
    if not success:
        failures.append(sprite_name)

print()
if failures:
    print(f"FAILED: {', '.join(failures)}", file=sys.stderr)
    sys.exit(1)
else:
    print("All sprite sheets generated successfully.")
    for f in os.listdir(OUT_DIR):
        path = os.path.join(OUT_DIR, f)
        print(f"  {path}  ({os.path.getsize(path)//1024} KB)")
