# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Generate an evil delivery bike enemy sprite."""

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
    "Full body portrait with generous padding, entire character and bike visible, "
    "leave empty space above and below so nothing is cropped. "
    "Character centered in frame."
)

PROMPT = (
    "Evil menacing food delivery rider on a bicycle, racing at high speed to the right. "
    "Riding an orange electric bike with a large insulated delivery backpack. "
    "The rider looks sinister and threatening — glowing red eyes, skull bandana over face, "
    "dark hoodie with torn sleeves, spiked leather gloves gripping handlebars. "
    "The delivery backpack has a pentagram symbol instead of a brand logo. "
    "Leaning forward aggressively on the bike, pedaling furiously, wheels spinning. "
    "Motion lines behind to show speed. Aggressive angry body language. "
    f"{_STYLE}"
)

OUT_DIR = os.path.join(REPO_ROOT, "public", "sprites", "delivery-enemy")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "delivery-enemy-ride.png")


def generate():
    print("Generating evil delivery enemy...", flush=True)

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
