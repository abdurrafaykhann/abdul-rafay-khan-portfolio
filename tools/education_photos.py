"""Prepare the Education section photos for the web.

Usage (from the project root):
    tools/.venv/Scripts/python tools/education_photos.py PHOTO DEGREE [top|bottom]

    PHOTO   graduation photo (any format Pillow reads)
    DEGREE  degree certificate image
    top|bottom  which edge of the photo the 4:5 crop keeps (default: top;
            use bottom for full-length shots so feet are not cut off)

Writes:
    public/education/graduation.webp   4:5 portrait crop, max 1000 px tall
    public/education/degree.webp       max 1400 px wide, with the
                                       verification QR code and certificate
                                       number blurred (see BLUR_BOXES)

Originals stay in tools/input/ (gitignored); only these outputs are published.
"""

import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

OUT = Path(__file__).resolve().parent.parent / "public" / "education"

# Areas to blur on the degree, as fractions of width/height
# (left, top, right, bottom). Tuned for the University of Hertfordshire
# eCertificate layout: the SmartVerify QR code (bottom right) and the
# certificate number (bottom centre).
BLUR_BOXES = [
    (0.795, 0.805, 0.905, 0.985),  # QR code
    (0.405, 0.935, 0.515, 0.975),  # certificate number
]


def portrait(path: str, anchor: str = "top") -> None:
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = img.size
    # centre a 4:5 crop horizontally; keep the top or bottom edge
    target_w = min(w, round(h * 4 / 5))
    target_h = round(target_w * 5 / 4)
    left = (w - target_w) // 2
    target_h = min(h, target_h)
    top = h - target_h if anchor == "bottom" else 0
    img = img.crop((left, top, left + target_w, top + target_h))
    if img.height > 1000:
        img = img.resize((round(img.width * 1000 / img.height), 1000), Image.LANCZOS)
    img.save(OUT / "graduation.webp", "WEBP", quality=85, method=6)
    print("graduation.webp", img.size)


def degree(path: str) -> None:
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = img.size
    for l, t, r, b in BLUR_BOXES:
        box = (round(l * w), round(t * h), round(r * w), round(b * h))
        region = img.crop(box).filter(ImageFilter.GaussianBlur(radius=max(w, h) / 60))
        img.paste(region, box)
    if img.width > 1400:
        img = img.resize((1400, round(img.height * 1400 / img.width)), Image.LANCZOS)
    img.save(OUT / "degree.webp", "WEBP", quality=85, method=6)
    print("degree.webp", img.size)


def main() -> None:
    if len(sys.argv) not in (3, 4) or sys.argv[3:] not in ([], ["top"], ["bottom"]):
        sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    portrait(sys.argv[1], sys.argv[3] if len(sys.argv) == 4 else "top")
    degree(sys.argv[2])


if __name__ == "__main__":
    main()
