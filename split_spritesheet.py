# /// script
# requires-python = ">=3.9"
# dependencies = ["Pillow"]
# ///

"""
Split an AI-generated sprite sheet into individual frame images.

Detects frame boundaries by finding vertical columns that are mostly
white/near-white, then crops each non-empty region into its own file.
"""

import argparse
import sys
from pathlib import Path

from PIL import Image


WHITE_THRESHOLD = 240  # Pixels with all RGB channels above this are "near-white"
EMPTY_COLUMN_RATIO = 0.95  # A column is "empty" if this fraction of pixels are near-white


def is_column_empty(pixels: list[tuple[int, int, int]], threshold: int, ratio: float) -> bool:
    if not pixels:
        return True
    near_white_count = sum(
        1 for r, g, b in pixels if r > threshold and g > threshold and b > threshold
    )
    return near_white_count / len(pixels) >= ratio


def find_frame_columns(img: Image.Image, threshold: int, ratio: float) -> list[bool]:
    """Return a list of booleans, one per column: True means the column is empty."""
    width, height = img.size
    rgb = img.convert("RGB")
    empty = []
    for x in range(width):
        column_pixels = [rgb.getpixel((x, y)) for y in range(height)]
        empty.append(is_column_empty(column_pixels, threshold, ratio))
    return empty


def find_frame_ranges(empty_columns: list[bool], min_gap: int, min_width: int) -> list[tuple[int, int]]:
    """
    Find contiguous ranges of non-empty columns, treating runs of fewer than
    min_gap empty columns as part of the same frame.

    Returns a list of (start, end) column index pairs (end is exclusive).
    """
    n = len(empty_columns)

    # First pass: mark columns as frame content vs. gap.
    # A gap only counts as a separator if it's at least min_gap wide.
    in_gap = [False] * n
    gap_start = None

    for x in range(n):
        if empty_columns[x]:
            if gap_start is None:
                gap_start = x
        else:
            if gap_start is not None:
                gap_width = x - gap_start
                if gap_width >= min_gap:
                    for g in range(gap_start, x):
                        in_gap[g] = True
                gap_start = None

    # Handle a trailing gap at the end of the image
    if gap_start is not None:
        gap_width = n - gap_start
        if gap_width >= min_gap:
            for g in range(gap_start, n):
                in_gap[g] = True

    # Second pass: collect contiguous runs of non-gap columns
    ranges: list[tuple[int, int]] = []
    frame_start = None

    for x in range(n):
        if not in_gap[x]:
            if frame_start is None:
                frame_start = x
        else:
            if frame_start is not None:
                ranges.append((frame_start, x))
                frame_start = None

    if frame_start is not None:
        ranges.append((frame_start, n))

    # Filter out frames that are too narrow to be real content
    ranges = [(start, end) for start, end in ranges if (end - start) >= min_width]

    return ranges


def split_spritesheet(
    input_path: Path,
    output_dir: Path,
    min_gap: int,
    min_width: int,
) -> int:
    img = Image.open(input_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    empty_columns = find_frame_columns(img, WHITE_THRESHOLD, EMPTY_COLUMN_RATIO)
    frame_ranges = find_frame_ranges(empty_columns, min_gap, min_width)

    if not frame_ranges:
        print("No frames detected. Try lowering --min-gap or --min-width.", file=sys.stderr)
        return 0

    height = img.size[1]
    for i, (start, end) in enumerate(frame_ranges, start=1):
        frame = img.crop((start, 0, end, height))
        out_path = output_dir / f"frame-{i:02d}.png"
        frame.save(out_path)
        print(f"  frame-{i:02d}.png  (columns {start}–{end}, width {end - start}px)")

    return len(frame_ranges)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split an AI-generated sprite sheet into individual frame images."
    )
    parser.add_argument("input_image", type=Path, help="Path to the sprite sheet image")
    parser.add_argument("output_dir", type=Path, help="Directory to write frame images into")
    parser.add_argument(
        "--min-gap",
        type=int,
        default=5,
        help="Minimum consecutive empty columns to treat as a frame boundary (default: 5)",
    )
    parser.add_argument(
        "--min-width",
        type=int,
        default=20,
        help="Minimum frame width in pixels to keep (default: 20)",
    )
    args = parser.parse_args()

    if not args.input_image.exists():
        print(f"Error: input image not found: {args.input_image}", file=sys.stderr)
        sys.exit(1)

    print(f"Splitting {args.input_image} (min-gap={args.min_gap}, min-width={args.min_width})")
    count = split_spritesheet(args.input_image, args.output_dir, args.min_gap, args.min_width)
    print(f"Done. {count} frame(s) written to {args.output_dir}/")


if __name__ == "__main__":
    main()
