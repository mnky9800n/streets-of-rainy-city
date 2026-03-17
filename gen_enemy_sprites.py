#!/usr/bin/env python3
"""Generate individual enemy pose images via OpenAI image API.

One API call per frame. Outputs to:
  public/sprites/enemy-thug-male/poses/
  public/sprites/enemy-thug-female/poses/

Usage:
  python gen_enemy_sprites.py
  python gen_enemy_sprites.py --variant male
  python gen_enemy_sprites.py --variant female --animation idle
  python gen_enemy_sprites.py --force
"""

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(REPO_ROOT, "openaikey")) as f:
    API_KEY = f.read().strip()

# ---------------------------------------------------------------------------
# Character base descriptions
# ---------------------------------------------------------------------------

_STYLE = (
    "90s Japanese arcade fighting game character art style, SNK King of Fighters or Capcom style, "
    "anime-influenced proportions, detailed smooth shading with soft gradients, "
    "clean precise linework, vibrant colors, dynamic pose, high detail rendering. "
    "NOT western comic style, NOT cartoon style. "
    "Side-view character facing right. White background. "
    "Full body portrait with generous padding, entire character visible from top of hair to bottom of feet, "
    "leave empty space above head and below feet so nothing is cropped. "
    "Character centered in frame. "
    "Same character same proportions same outfit as all other frames in this animation set."
)

BASE_CHAR = {
    "male": (
        "Skinny wiry young man, lean scrappy build, tall bright green mohawk, pale skin, "
        "torn sleeveless black band t-shirt, ripped black jeans with a chain belt, "
        "heavy black combat boots, safety pins and patches on clothes, "
        "sneering expression, dark circles under eyes, scruffy and unwashed. "
        + _STYLE
    ),
    "female": (
        "Skinny wiry young woman, lean scrappy build, shaved sides with purple liberty spikes mohawk, "
        "pale skin, torn fishnet top layered over a ripped tank top, "
        "plaid mini skirt with safety pins, knee-high lace-up boots, "
        "studded leather wrist cuffs, sneering expression, heavy smudged black eyeliner, "
        "scruffy and unwashed. "
        + _STYLE
    ),
}

# ---------------------------------------------------------------------------
# Animation definitions: (animation_name, frame_count, frame_descriptions)
# ---------------------------------------------------------------------------

ANIMATIONS = [
    (
        "idle",
        6,
        [
            "Frame 1 of 6: neutral fighting stance, weight balanced, fists loosely raised in guard.",
            "Frame 2 of 6: slight inhale, body rises a few pixels, chest forward, weight still centered.",
            "Frame 3 of 6: continued inhale at peak, shoulders up slightly, fists still in guard.",
            "Frame 4 of 6: exhale, body settles back down, shoulders relaxing slightly.",
            "Frame 5 of 6: subtle weight shift to left foot, right foot slightly lighter on ground.",
            "Frame 6 of 6: weight shifting back to right foot, returning toward neutral stance.",
        ],
    ),
    (
        "walk",
        8,
        [
            "Frame 1 of 8: walk cycle contact pose, left foot forward heel striking ground, right arm swinging forward, aggressive stride.",
            "Frame 2 of 8: walk cycle down pose, left foot flat on ground, body weight settling forward over front foot.",
            "Frame 3 of 8: walk cycle passing pose, right leg swinging forward past left, body at mid-stride height.",
            "Frame 4 of 8: walk cycle up pose, body rising, right foot about to contact ground, left arm forward.",
            "Frame 5 of 8: walk cycle contact pose mirrored, right foot forward heel striking ground, left arm swinging forward.",
            "Frame 6 of 8: walk cycle down pose mirrored, right foot flat, body weight settling over right foot.",
            "Frame 7 of 8: walk cycle passing pose mirrored, left leg swinging forward past right, mid-stride.",
            "Frame 8 of 8: walk cycle up pose mirrored, body rising, left foot about to contact, right arm forward.",
        ],
    ),
    (
        "punch",
        6,
        [
            "Frame 1 of 6: punch wind-up, right shoulder pulling back, weight shifting to rear foot, fist drawn back at hip.",
            "Frame 2 of 6: punch launching, body rotating forward, right fist beginning to extend toward right.",
            "Frame 3 of 6: punch fully extended, right fist outstretched to the right at chest height, body twisted forward, left arm back for balance.",
            "Frame 4 of 6: punch moment of impact, fist horizontal, arm fully extended, body leaning into the blow.",
            "Frame 5 of 6: punch retracting, right arm pulling back toward body, weight shifting back.",
            "Frame 6 of 6: return to fighting stance, both fists back in guard position, weight balanced.",
        ],
    ),
    (
        "hit",
        4,
        [
            "Frame 1 of 4: impact moment, head snapping back and to the right from a left-side punch, body twisting, expression of pain.",
            "Frame 2 of 4: recoil peak, staggering backward to the left, arms flailing outward for balance, off-balance.",
            "Frame 3 of 4: recovering, leaning forward to regain balance, grimacing, hands coming back up.",
            "Frame 4 of 4: back in guard stance, shaking it off, determined angry expression.",
        ],
    ),
    (
        "knockback",
        6,
        [
            "Frame 1 of 6: heavy hit impact, body lurching sharply backward, head snapping to the right, legs beginning to buckle.",
            "Frame 2 of 6: stumbling backward, arms windmilling, losing balance, feet skidding.",
            "Frame 3 of 6: falling backward, body now nearly horizontal mid-fall, arms out to sides.",
            "Frame 4 of 6: hitting ground hard on back, body flat, impact pose, slight bounce.",
            "Frame 5 of 6: lying flat on ground dazed, arms splayed, eyes showing stars.",
            "Frame 6 of 6: starting to push self back up, one arm propped under torso, head lifting.",
        ],
    ),
    (
        "death",
        8,
        [
            "Frame 1 of 8: final devastating hit impact, body jolting violently to the right, head snapping back.",
            "Frame 2 of 8: going limp, legs beginning to buckle under body weight, arms dropping.",
            "Frame 3 of 8: crumpling downward, knees bending, body folding in on itself.",
            "Frame 4 of 8: knees hitting ground, upper body still upright but swaying.",
            "Frame 5 of 8: torso falling forward, arms out limply, face heading toward ground.",
            "Frame 6 of 8: sprawled face-down on ground, arms out to sides.",
            "Frame 7 of 8: completely still, lying face-down, no movement.",
            "Frame 8 of 8: final KO pose, fully defeated, lying still, one arm at awkward angle.",
        ],
    ),
]

ANIMATION_NAMES = [name for name, _, _ in ANIMATIONS]


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def generate_frame(out_path: str, prompt: str) -> bool:
    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1536",
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
        print(f"  HTTP {e.code}: {body}", file=sys.stderr)
        return False

    b64 = data.get("data", [{}])[0].get("b64_json")
    if not b64:
        print(f"  No b64_json in response: {data}", file=sys.stderr)
        return False

    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))

    size_kb = os.path.getsize(out_path) // 1024
    print(f"  Saved {out_path} ({size_kb} KB)", flush=True)
    return True


def build_prompt(variant: str, anim_name: str, frame_index: int, frame_count: int, frame_desc: str) -> str:
    char_desc = BASE_CHAR[variant]
    return (
        f"{char_desc} "
        f"Animation: {anim_name.upper()}, {frame_count}-frame sequence. "
        f"{frame_desc}"
    )


def poses_dir(variant: str) -> str:
    return os.path.join(REPO_ROOT, "public", "sprites", f"enemy-thug-{variant}", "poses")


def frame_filename(anim_name: str, frame_index: int) -> str:
    return f"{anim_name}-{frame_index:02d}.png"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate enemy thug pose images via OpenAI.")
    parser.add_argument(
        "--variant",
        choices=["male", "female", "both"],
        default="both",
        help="Character variant to generate (default: both)",
    )
    parser.add_argument(
        "--animation",
        choices=ANIMATION_NAMES,
        default=None,
        help="Generate only this animation (default: all)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate files that already exist",
    )
    return parser.parse_args()


def run(variant: str, animations: list, force: bool) -> list[str]:
    out_dir = poses_dir(variant)
    os.makedirs(out_dir, exist_ok=True)

    failures = []

    for anim_name, frame_count, frame_descs in animations:
        print(f"\n[{variant}] {anim_name} ({frame_count} frames)")
        for i, frame_desc in enumerate(frame_descs, start=1):
            filename = frame_filename(anim_name, i)
            out_path = os.path.join(out_dir, filename)

            if not force and os.path.exists(out_path):
                print(f"  Skipping {filename} (already exists)", flush=True)
                continue

            print(f"  Generating {filename} ...", flush=True)
            prompt = build_prompt(variant, anim_name, i, frame_count, frame_desc)
            success = generate_frame(out_path, prompt)
            if not success:
                failures.append(f"{variant}/{anim_name}/{filename}")

    return failures


def main() -> None:
    args = parse_args()

    variants = ["male", "female"] if args.variant == "both" else [args.variant]

    selected_animations = (
        [(name, count, descs) for name, count, descs in ANIMATIONS if name == args.animation]
        if args.animation
        else ANIMATIONS
    )

    if not selected_animations:
        print(f"Unknown animation: {args.animation}", file=sys.stderr)
        sys.exit(1)

    all_failures = []
    for variant in variants:
        failures = run(variant, selected_animations, args.force)
        all_failures.extend(failures)

    print()
    if all_failures:
        print(f"FAILED ({len(all_failures)}):", file=sys.stderr)
        for f in all_failures:
            print(f"  {f}", file=sys.stderr)
        sys.exit(1)
    else:
        print("All frames generated successfully.")
        for variant in variants:
            out_dir = poses_dir(variant)
            if os.path.isdir(out_dir):
                files = sorted(os.listdir(out_dir))
                print(f"\n  {out_dir}")
                for fname in files:
                    fpath = os.path.join(out_dir, fname)
                    print(f"    {fname}  ({os.path.getsize(fpath) // 1024} KB)")


if __name__ == "__main__":
    main()
