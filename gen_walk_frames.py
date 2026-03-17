# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Generate individual walk cycle frames with radically different poses.

Avoids the word 'walk' in prompts to prevent the AI from defaulting
to the same generic mid-stride pose every time.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(REPO_ROOT, "openaikey")) as f:
    API_KEY = f.read().strip()

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

JENNIFER = (
    "Young woman fighter, athletic build, long wavy blonde hair, blue eyes, "
    "white low-cut top with blue suspender tie, brown leather belt, "
    "black denim shorts with frayed hem, black lace-up combat boots, white ankle socks, "
    "gold brass-knuckle wrist guards on both fists. "
)

ENEMY_MALE = (
    "Skinny wiry young man, lean scrappy build, tall bright green mohawk, pale skin, "
    "torn sleeveless black band t-shirt, ripped black jeans with a chain belt, "
    "heavy black combat boots, safety pins and patches on clothes, "
    "sneering expression, dark circles under eyes, scruffy and unwashed. "
)

ENEMY_FEMALE = (
    "Skinny wiry young woman, lean scrappy build, shaved sides with purple liberty spikes mohawk, "
    "pale skin, torn fishnet top layered over a ripped tank top, "
    "plaid mini skirt with safety pins, knee-high lace-up boots, "
    "studded leather wrist cuffs, sneering expression, heavy smudged black eyeliner, "
    "scruffy and unwashed. "
)

# Each frame describes a COMPLETELY different body position.
# We avoid the word "walk" and instead describe exact leg geometry.
# All frames: character faces RIGHT (looking toward the right side of the image).
# Frames 1-4: Right foot steps forward. Frames 5-8: Left foot steps forward.
WALK_FRAMES = [
    # --- RIGHT FOOT STEPPING FORWARD (frames 1-4) ---
    # Frame 1: Left foot planted, right foot just lifting off behind
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "Standing on LEFT FOOT which is flat on the ground, leg mostly straight. "
        "RIGHT LEG is BEHIND the body, knee bent, foot just lifting off the ground. "
        "Legs are fairly close together. Left arm forward, right arm back. "
        "Body upright, facing right."
    ),
    # Frame 2: Right foot passing the left leg at ankle height (mid-step)
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "Standing on LEFT FOOT, leg straight, planted on ground. "
        "RIGHT FOOT is swinging forward, passing alongside the left ankle, lifted only slightly off the ground. "
        "The right knee is slightly bent as the leg swings through. "
        "BOTH LEGS ARE CLOSE TOGETHER, nearly touching at the ankles. This is a MID-STEP, NOT a kick. "
        "Left arm back, right arm forward. Body upright, facing right."
    ),
    # Frame 3: Right leg extends forward, reaching out
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "LEFT LEG is behind, heel lifting off the ground, pushing off. "
        "RIGHT LEG extends forward to the right, foot reaching out, about to touch down. "
        "Legs are moderately spread apart, opening into a stride. "
        "Right arm back, left arm forward. Body upright, facing right."
    ),
    # Frame 4: Deep lunge with right foot forward
    (
        "Character FACING RIGHT, nose pointing to the right edge of the image, body in profile view. "
        "In a deep forward LUNGE. RIGHT LEG extended far forward to the RIGHT SIDE of the image, "
        "knee bent at 90 degrees, foot flat on ground, pointing right. "
        "LEFT LEG stretched far behind to the LEFT SIDE of the image, almost straight, toe on ground. "
        "Legs form a very wide V-shape. Left arm forward, right arm back. "
        "Character's face is in profile, looking RIGHT. Body upright."
    ),
    # --- LEFT FOOT STEPPING FORWARD (frames 5-8) ---
    # Frame 5: Right foot planted, left foot just lifting off behind
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "Standing on RIGHT FOOT which is flat on the ground, leg mostly straight. "
        "LEFT LEG is BEHIND the body, knee bent, foot just lifting off the ground. "
        "Legs are fairly close together. Right arm forward, left arm back. "
        "Body upright, facing right."
    ),
    # Frame 6: Left foot passing the right leg at ankle height (mid-step)
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "Standing on RIGHT FOOT, leg straight, planted on ground. "
        "LEFT FOOT is swinging forward, passing alongside the right ankle, lifted only slightly off the ground. "
        "The left knee is slightly bent as the leg swings through. "
        "BOTH LEGS ARE CLOSE TOGETHER, nearly touching at the ankles. This is a MID-STEP, NOT a kick. "
        "Right arm back, left arm forward. Body upright, facing right."
    ),
    # Frame 7: Left leg extends forward, reaching out
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "RIGHT LEG is behind, heel lifting off the ground, pushing off. "
        "LEFT LEG extends forward to the right, foot reaching out, about to touch down. "
        "Legs are moderately spread apart, opening into a stride. "
        "Left arm back, right arm forward. Body upright, facing right."
    ),
    # Frame 8: Deep lunge with left foot forward
    (
        "Character FACING RIGHT, looking toward the right side of the image. "
        "In a deep forward LUNGE. LEFT LEG extended far forward to the right, "
        "knee bent at 90 degrees, foot flat on ground. "
        "RIGHT LEG stretched far behind to the left, almost straight, toe on ground. "
        "Legs form a very wide V-shape. Right arm forward, left arm back. "
        "Body upright, facing right."
    ),
]


def generate_frame(out_path, prompt):
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


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", choices=["jennifer", "enemy-male", "enemy-female"], default="jennifer")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    chars = {
        "jennifer": (JENNIFER, "public/sprites/jennifer/poses"),
        "enemy-male": (ENEMY_MALE, "public/sprites/enemy-thug-male/poses"),
        "enemy-female": (ENEMY_FEMALE, "public/sprites/enemy-thug-female/poses"),
    }

    char_desc, rel_dir = chars[args.character]
    out_dir = os.path.join(REPO_ROOT, rel_dir)
    os.makedirs(out_dir, exist_ok=True)
    failures = []

    for i, frame_desc in enumerate(WALK_FRAMES, start=1):
        filename = f"walk-{i:02d}.png"
        out_path = os.path.join(out_dir, filename)

        if not args.force and os.path.exists(out_path):
            print(f"  Skipping {filename} (exists)", flush=True)
            continue

        prompt = f"{char_desc}{_STYLE} {frame_desc}"
        print(f"  Generating {filename} ...", flush=True)
        if not generate_frame(out_path, prompt):
            failures.append(filename)

    if failures:
        print(f"FAILED: {failures}", file=sys.stderr)
        sys.exit(1)
    else:
        print("All walk frames generated.")


if __name__ == "__main__":
    main()
