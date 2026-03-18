# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Generate a single sprite sheet for the delivery bike enemy."""

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
    "clean precise linework, vibrant colors, high detail rendering. "
    "NOT western comic style, NOT cartoon style. "
    "White background."
)

PROMPT = (
    f"Sprite sheet, 4 frames in a single horizontal row, evenly spaced on white background. {_STYLE} "
    "Each frame shows the EXACT SAME evil delivery rider on the EXACT SAME orange electric bicycle. "
    "The rider has a skull face with glowing red eyes, dark hoodie, spiked leather gloves, "
    "and an orange delivery backpack with a pentagram symbol. "
    "The bike is FLAT and LEVEL, wheels on a horizontal ground line, NOT tilted or angled. "
    "Side-view profile, rider facing right. "
    "The ONLY difference between frames is the pedal and leg positions for a pedaling cycle: "
    "Frame 1: right pedal DOWN at 6 o'clock, left pedal UP at 12 o'clock, right leg extended, left knee bent up. "
    "Frame 2: right pedal BACK at 9 o'clock, left pedal FORWARD at 3 o'clock, legs at equal angles. "
    "Frame 3: right pedal UP at 12 o'clock, left pedal DOWN at 6 o'clock, right knee bent up, left leg extended. "
    "Frame 4: right pedal FORWARD at 3 o'clock, left pedal BACK at 9 o'clock, legs at equal angles. "
    "Everything else stays IDENTICAL across all 4 frames — same body pose, same bike, same angle. "
    "Frames evenly spaced side by side, no overlap, numbered 1-4 below each frame."
)

OUT_DIR = os.path.join(REPO_ROOT, "public", "sprites", "delivery-enemy")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "delivery-enemy-ride-sheet.png")


def generate():
    print("Generating delivery enemy sprite sheet...", flush=True)

    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": PROMPT,
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
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)

    b64 = data.get("data", [{}])[0].get("b64_json")
    if not b64:
        print(f"No b64_json in response: {data}", file=sys.stderr)
        sys.exit(1)

    with open(OUT_PATH, "wb") as f:
        f.write(base64.b64decode(b64))

    size_kb = os.path.getsize(OUT_PATH) // 1024
    print(f"Saved {OUT_PATH} ({size_kb} KB)")


if __name__ == "__main__":
    generate()
