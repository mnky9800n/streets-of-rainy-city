# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Generate a single walk cycle sprite sheet for Jennifer via OpenAI API.

Generates one wide image with 8 walk frames side by side, then we use
split_spritesheet.py to cut them into individual frames.
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
    "Same character same proportions same outfit as all other frames in this animation set."
)

BASE_CHAR = (
    "Young woman fighter, athletic build, long wavy blonde hair, blue eyes, "
    "white low-cut top with blue suspender tie, brown leather belt, "
    "black denim shorts with frayed hem, black lace-up combat boots, white ankle socks, "
    "gold brass-knuckle wrist guards on both fists. "
)

PROMPT = (
    f"Sprite sheet: {BASE_CHAR}{_STYLE} "
    "WALK CYCLE animation, 8 frames in a single horizontal row. "
    "PLAIN WHITE BACKGROUND. NO gradient, NO floor, NO shadows on background. Pure white #FFFFFF background everywhere. "
    "Each frame is separated by a clear WIDE GAP of white space — at least 30 pixels of pure white between each character. "
    "Characters DO NOT overlap or touch each other. "
    "Classic 8-frame walk cycle with clearly different leg positions in each frame: "
    "Frame 1: RIGHT foot contact - right heel strikes ground far forward, left leg extended back, arms in opposite swing. "
    "Frame 2: RIGHT foot down - right foot flat, body weight drops onto front foot, left toe still touching behind. "
    "Frame 3: RIGHT foot passing - left leg swings forward past right (legs close together/crossing), body at lowest point. "
    "Frame 4: RIGHT foot up - body rises, left foot reaching forward, right foot pushing off behind. "
    "Frame 5: LEFT foot contact - left heel strikes ground far forward, right leg extended back, mirror of frame 1. "
    "Frame 6: LEFT foot down - left foot flat, body weight drops forward, right toe still behind, mirror of frame 2. "
    "Frame 7: LEFT foot passing - right leg swings forward past left (legs close together/crossing), mirror of frame 3. "
    "Frame 8: LEFT foot up - body rises, right foot reaching forward, left pushing off, mirror of frame 4. "
    "Each frame must show a DISTINCTLY DIFFERENT leg position. The legs should be wide apart in contact frames "
    "and close together in passing frames. This is critical for animation. "
    "Frames evenly spaced side by side, no overlap, numbered 1-8 below each frame."
)

OUT_PATH = os.path.join(REPO_ROOT, "public", "sprites", "jennifer", "poses", "walk-sheet.png")


def generate():
    print("Generating Jennifer walk sprite sheet...", flush=True)

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

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "wb") as f:
        f.write(base64.b64decode(b64))

    size_kb = os.path.getsize(OUT_PATH) // 1024
    print(f"Saved {OUT_PATH} ({size_kb} KB)")


if __name__ == "__main__":
    generate()
