# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Generate delivery bike enemy ride cycle frames."""

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
    "Full body portrait with generous padding, entire character and bike visible from left wheel to right wheel, "
    "leave empty space above and below so nothing is cropped. "
    "Character centered in frame. "
    "Same character same proportions same bike same outfit as all other frames in this animation set."
)

CHAR = (
    "Evil menacing food delivery rider on an orange electric bicycle. "
    "The rider has a skull face with glowing red eyes, wearing a dark hoodie with torn sleeves, "
    "skull bandana over face, spiked leather gloves gripping handlebars. "
    "Large orange insulated delivery backpack with a pentagram symbol on it. "
    "The bike and rider are PERFECTLY LEVEL and HORIZONTAL — the bike wheels are on a flat ground line, "
    "the bike frame is parallel to the ground, NOT tilted or at an angle. "
    "Viewed from the side in pure profile, riding to the right. "
)

RIDE_FRAMES = [
    (
        "Pedaling frame 1: RIGHT foot pressing down on the pedal at the bottom of the stroke, "
        "LEFT foot at the top of the pedal stroke with knee bent up. "
        "Wheels have spokes visible. Rider leaning forward slightly, gripping handlebars. "
        "Bike is FLAT and LEVEL on the ground, not tilted."
    ),
    (
        "Pedaling frame 2: RIGHT foot moving backward and up on the pedal stroke, "
        "LEFT foot moving forward and down. Both pedals at the midpoint, legs at equal angles. "
        "Wheels have spokes at a slightly different angle than frame 1. "
        "Bike is FLAT and LEVEL on the ground, not tilted."
    ),
    (
        "Pedaling frame 3: LEFT foot pressing down on the pedal at the bottom of the stroke, "
        "RIGHT foot at the top of the pedal stroke with knee bent up. "
        "Mirror of frame 1 leg positions. Wheels have spokes visible. "
        "Bike is FLAT and LEVEL on the ground, not tilted."
    ),
    (
        "Pedaling frame 4: LEFT foot moving backward and up on the pedal stroke, "
        "RIGHT foot moving forward and down. Both pedals at the midpoint, legs at equal angles. "
        "Mirror of frame 2 leg positions. Wheels have spokes at a slightly different angle. "
        "Bike is FLAT and LEVEL on the ground, not tilted."
    ),
]

OUT_DIR = os.path.join(REPO_ROOT, "public", "sprites", "delivery-enemy", "poses")
os.makedirs(OUT_DIR, exist_ok=True)


def generate_frame(out_path, prompt):
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
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    failures = []
    for i, frame_desc in enumerate(RIDE_FRAMES, start=1):
        filename = f"ride-{i:02d}.png"
        out_path = os.path.join(OUT_DIR, filename)

        if not args.force and os.path.exists(out_path):
            print(f"  Skipping {filename} (exists)", flush=True)
            continue

        prompt = f"{CHAR}{_STYLE} {frame_desc}"
        print(f"  Generating {filename} ...", flush=True)
        if not generate_frame(out_path, prompt):
            failures.append(filename)

    if failures:
        print(f"FAILED: {failures}", file=sys.stderr)
        sys.exit(1)
    else:
        print("All ride frames generated.")


if __name__ == "__main__":
    main()
