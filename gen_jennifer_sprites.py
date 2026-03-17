#!/usr/bin/env python3
"""Generate individual Jennifer pose images via OpenAI image API.

One API call per frame. Outputs to:
  public/sprites/jennifer/poses/

Usage:
  python gen_jennifer_sprites.py
  python gen_jennifer_sprites.py --animation idle
  python gen_jennifer_sprites.py --animation punch
  python gen_jennifer_sprites.py --force
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
# Character base description
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

BASE_CHAR = (
    "Young woman fighter, athletic build, long wavy blonde hair, blue eyes, "
    "white low-cut top with blue suspender tie, brown leather belt, "
    "black denim shorts with frayed hem, black lace-up combat boots, white ankle socks, "
    "gold brass-knuckle wrist guards on both fists. "
    + _STYLE
)

# ---------------------------------------------------------------------------
# Animation definitions: (animation_name, frame_count, frame_descriptions)
# ---------------------------------------------------------------------------

ANIMATIONS = [
    (
        "idle",
        6,
        [
            "Frame 1 of 6: neutral fighting stance, weight balanced, fists loosely raised in guard, brass-knuckle wrist guards visible.",
            "Frame 2 of 6: slight inhale, body rises a few pixels, chest forward, hair settling, weight still centered.",
            "Frame 3 of 6: continued inhale at peak, shoulders up slightly, fists still raised in guard, hair slightly shifted.",
            "Frame 4 of 6: exhale, body settles back down, shoulders relaxing slightly, hair falling back.",
            "Frame 5 of 6: subtle weight shift to left foot, right foot slightly lighter on ground, hips tilting slightly.",
            "Frame 6 of 6: weight shifting back to right foot, returning toward neutral stance, hair swaying gently.",
        ],
    ),
    (
        "walk",
        8,
        [
            "Frame 1 of 8: walk cycle contact pose, left foot forward heel striking ground, right arm swinging forward, confident aggressive stride, hair bouncing.",
            "Frame 2 of 8: walk cycle down pose, left foot flat on ground, body weight settling forward over front foot, hair mid-bounce.",
            "Frame 3 of 8: walk cycle passing pose, right leg swinging forward past left, body at mid-stride height, hair flowing back.",
            "Frame 4 of 8: walk cycle up pose, body rising, right foot about to contact ground, left arm forward, hair lifted.",
            "Frame 5 of 8: walk cycle contact pose mirrored, right foot forward heel striking ground, left arm swinging forward, hair bouncing.",
            "Frame 6 of 8: walk cycle down pose mirrored, right foot flat, body weight settling over right foot, hair mid-bounce.",
            "Frame 7 of 8: walk cycle passing pose mirrored, left leg swinging forward past right, mid-stride, hair flowing back.",
            "Frame 8 of 8: walk cycle up pose mirrored, body rising, left foot about to contact, right arm forward, hair lifted.",
        ],
    ),
    (
        "punch",
        12,
        [
            # Left jab: frames 1-4
            "Frame 1 of 12: first hit left jab wind-up, left shoulder pulling back slightly, weight shifting to rear foot, left fist drawn back, brass-knuckle guard catching light.",
            "Frame 2 of 12: first hit left jab launching, body rotating forward to the right, left fist beginning to extend outward, hair swinging with momentum.",
            "Frame 3 of 12: first hit left jab fully extended, left fist outstretched to the right at chest height, arm fully extended, right fist back as counterbalance.",
            "Frame 4 of 12: first hit left jab retracting, left arm pulling back toward body, weight beginning to shift for next strike, expression focused.",
            # Right cross: frames 5-8
            "Frame 5 of 12: second hit right cross wind-up, right shoulder rotating back, hips loading up power, right fist drawn back at hip, body coiling.",
            "Frame 6 of 12: second hit right cross launching, hips rotating forward powerfully, right fist beginning to extend, left fist pulling back for balance.",
            "Frame 7 of 12: second hit right cross fully extended, right fist driving forward to the right at jaw height, body fully rotated into the blow, brass-knuckle guard prominent.",
            "Frame 8 of 12: second hit right cross retracting, right arm pulling back, body already coiling for uppercut finisher, expression intense.",
            # Uppercut finisher: frames 9-12
            "Frame 9 of 12: third hit uppercut wind-up, knees bending into a crouch, right fist dropping low near hip, weight loading on bent legs, crouching posture.",
            "Frame 10 of 12: third hit uppercut launching, legs driving upward explosively, right fist rising in an upward arc from low to high, body rising.",
            "Frame 11 of 12: third hit uppercut at peak, right fist at maximum height above head in upward arc, body fully extended upward, on tiptoe or slight jump, hair flying upward.",
            "Frame 12 of 12: uppercut follow-through, right arm arcing past peak and settling, landing back on feet, returning to guard stance, triumphant expression.",
        ],
    ),
    (
        "jump",
        4,
        [
            "Frame 1 of 4: jump crouch wind-up, knees bent deeply, arms pulling downward, body compressed low, preparing to launch.",
            "Frame 2 of 4: jump launch, legs driving powerfully upward, feet leaving ground, arms rising, hair flying upward with momentum.",
            "Frame 3 of 4: jump apex, body at full height, legs slightly tucked, arms out for balance, hair billowing above, suspended in air.",
            "Frame 4 of 4: jump landing, feet touching ground, knees bending to absorb impact, arms out for balance, hair falling back down.",
        ],
    ),
    (
        "jumpkick",
        4,
        [
            "Frame 1 of 4: jump kick wind-up, airborne, right leg chambering back with knee raised high, left leg extended downward for balance, arms out.",
            "Frame 2 of 4: jump kick extending, right leg driving forward and outward to the right, combat boot leading, body leaning into kick.",
            "Frame 3 of 4: jump kick fully extended, right leg fully outstretched to the right, combat boot at point of impact, body horizontal in air, arms swept back.",
            "Frame 4 of 4: jump kick retracting, right leg pulling back in, body returning upright in air, preparing for landing.",
        ],
    ),
    (
        "hit",
        4,
        [
            "Frame 1 of 4: impact moment, head snapping back and to the right from a hit, hair whipping forward, body twisting, expression of pain and surprise.",
            "Frame 2 of 4: recoil peak, staggering backward to the left, arms flailing outward for balance, off-balance, hair disheveled.",
            "Frame 3 of 4: recovering, leaning forward to regain balance, grimacing, hands coming back up into guard, hair settling.",
            "Frame 4 of 4: back in fighting guard stance, shaking it off, determined angry expression, fists raised with brass-knuckle wrist guards.",
        ],
    ),
    (
        "knockback",
        6,
        [
            "Frame 1 of 6: heavy hit impact, body lurching sharply backward, head snapping to the right, hair flying wildly, legs beginning to buckle.",
            "Frame 2 of 6: stumbling backward, arms windmilling, losing balance, feet skidding on ground, hair still flying.",
            "Frame 3 of 6: falling backward, body now nearly horizontal mid-fall, arms out to sides, hair spreading out.",
            "Frame 4 of 6: hitting ground hard on back, body flat, impact pose, slight bounce, hair splayed on ground.",
            "Frame 5 of 6: lying flat on ground dazed, arms splayed, hair spread out, eyes showing stars, wrist guards resting on ground.",
            "Frame 6 of 6: starting to push self back up, one arm propped under torso, head lifting, hair falling forward, gritting teeth.",
        ],
    ),
    (
        "death",
        8,
        [
            "Frame 1 of 8: final devastating hit impact, body jolting violently to the right, head snapping back, hair whipping wildly.",
            "Frame 2 of 8: going limp, legs beginning to buckle under body weight, arms dropping loosely, hair falling.",
            "Frame 3 of 8: crumpling downward, knees bending, body folding in on itself, hair cascading forward.",
            "Frame 4 of 8: knees hitting ground hard, upper body still upright but swaying forward, hair falling over face.",
            "Frame 5 of 8: torso falling forward, arms out limply, face heading toward ground, hair draping down.",
            "Frame 6 of 8: sprawled face-down on ground, arms out to sides, hair spread around head, wrist guards resting flat.",
            "Frame 7 of 8: completely still, lying face-down, no movement, hair settled, fully defeated.",
            "Frame 8 of 8: final KO pose, fully defeated, lying still, one arm at awkward angle, brass-knuckle wrist guard visible.",
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


def build_prompt(anim_name: str, frame_count: int, frame_desc: str) -> str:
    return (
        f"{BASE_CHAR} "
        f"Animation: {anim_name.upper()}, {frame_count}-frame sequence. "
        f"{frame_desc}"
    )


def poses_dir() -> str:
    return os.path.join(REPO_ROOT, "public", "sprites", "jennifer", "poses")


def frame_filename(anim_name: str, frame_index: int) -> str:
    return f"{anim_name}-{frame_index:02d}.png"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Jennifer pose images via OpenAI.")
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


def run(animations: list, force: bool) -> list[str]:
    out_dir = poses_dir()
    os.makedirs(out_dir, exist_ok=True)

    failures = []

    for anim_name, frame_count, frame_descs in animations:
        print(f"\n[jennifer] {anim_name} ({frame_count} frames)")
        for i, frame_desc in enumerate(frame_descs, start=1):
            filename = frame_filename(anim_name, i)
            out_path = os.path.join(out_dir, filename)

            if not force and os.path.exists(out_path):
                print(f"  Skipping {filename} (already exists)", flush=True)
                continue

            print(f"  Generating {filename} ...", flush=True)
            prompt = build_prompt(anim_name, frame_count, frame_desc)
            success = generate_frame(out_path, prompt)
            if not success:
                failures.append(f"jennifer/{anim_name}/{filename}")

    return failures


def main() -> None:
    args = parse_args()

    selected_animations = (
        [(name, count, descs) for name, count, descs in ANIMATIONS if name == args.animation]
        if args.animation
        else ANIMATIONS
    )

    if not selected_animations:
        print(f"Unknown animation: {args.animation}", file=sys.stderr)
        sys.exit(1)

    failures = run(selected_animations, args.force)

    print()
    if failures:
        print(f"FAILED ({len(failures)}):", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        sys.exit(1)
    else:
        print("All frames generated successfully.")
        out_dir = poses_dir()
        if os.path.isdir(out_dir):
            files = sorted(os.listdir(out_dir))
            print(f"\n  {out_dir}")
            for fname in files:
                fpath = os.path.join(out_dir, fname)
                print(f"    {fname}  ({os.path.getsize(fpath) // 1024} KB)")


if __name__ == "__main__":
    main()
