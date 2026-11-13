"""Remove the background from a portrait photo and save it for the hero.

Usage (from the project root):
    tools/.venv/Scripts/python tools/cutout.py tools/input/photo.webp

Writes public/hero/portrait.webp (transparent background, trimmed to the person).
The depth-map step for the 3D hero is added to this pipeline in milestone M7.
"""

import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import new_session, remove

MAX_HEIGHT = 1400
# Height / width of the saved portrait (head to mid-torso).
ASPECT = 1.3
OUT = Path(__file__).resolve().parent.parent / "public" / "hero" / "portrait.webp"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Image.open(sys.argv[1]).convert("RGB")

    session = new_session("isnet-general-use")
    cut = remove(src, session=session, post_process_mask=True)

    # Pull the mask in by ~1px and soften it, to drop the light fringe the
    # old background leaves around the silhouette.
    alpha = cut.getchannel("A")
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    cut.putalpha(alpha)

    # Trim empty margins at the top and sides, then keep a head-and-torso
    # crop (height = ASPECT x width) so the portrait fits inside the hero.
    left, top, right, _ = cut.getbbox()
    bottom = min(cut.height, top + round((right - left) * ASPECT))
    cut = cut.crop((left, top, right, bottom))

    if cut.height > MAX_HEIGHT:
        scale = MAX_HEIGHT / cut.height
        cut = cut.resize((round(cut.width * scale), MAX_HEIGHT), Image.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cut.save(OUT, "WEBP", quality=88, method=6)
    print(f"saved {OUT} {cut.size} {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
