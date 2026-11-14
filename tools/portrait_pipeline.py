"""Depth map + particle data for the 3D hero portrait.

Usage (from the project root):
    tools/.venv/Scripts/python tools/portrait_pipeline.py [PORTRAIT]

PORTRAIT defaults to public/hero/portrait.webp: a background-removed RGBA
cut-out (make one with tools/cutout.py).

Writes:
    public/hero/depth.webp      grayscale depth, same size as the portrait
                                (white = near, black = far), smoothed
    public/hero/particles.bin   8,000 points sampled from the person:
                                float32 [x, y, z, r, g, b] each, shuffled so
                                any prefix is an even sample (phones use 3,000)

Depth model: Depth Anything V2 Small (Apache-2.0), ONNX export from
huggingface.co/onnx-community/depth-anything-v2-small. Downloaded once
(~100 MB) into tools/models/ (gitignored). Runs on CPU in a few seconds.
"""

import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MODEL_URL = (
    "https://huggingface.co/onnx-community/depth-anything-v2-small/"
    "resolve/main/onnx/model.onnx"
)
MODEL = ROOT / "tools" / "models" / "depth-anything-v2-small.onnx"
OUT_DIR = ROOT / "public" / "hero"
N_POINTS = 8000
SIZE = 518  # model input size (multiple of 14)
SEED = 7


def ensure_model() -> Path:
    if not MODEL.exists():
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading depth model to {MODEL} …")
        tmp = MODEL.with_suffix(".part")
        urllib.request.urlretrieve(MODEL_URL, tmp)
        tmp.rename(MODEL)
    return MODEL


def estimate_depth(rgb: Image.Image) -> np.ndarray:
    """Relative depth in [0, 1] at the image's size (1 = nearest)."""
    session = ort.InferenceSession(str(ensure_model()), providers=["CPUExecutionProvider"])
    x = np.asarray(rgb.resize((SIZE, SIZE), Image.BICUBIC), dtype=np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None]
    name = session.get_inputs()[0].name
    out = session.run(None, {name: x})[0]
    d = np.squeeze(out).astype(np.float32)  # disparity: larger = closer
    d_img = Image.fromarray(d).resize(rgb.size, Image.BICUBIC)
    return np.asarray(d_img, dtype=np.float32)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT_DIR / "portrait.webp"
    rgba = Image.open(src).convert("RGBA")
    w, h = rgba.size
    alpha = np.asarray(rgba.getchannel("A"), dtype=np.float32) / 255.0
    mask = alpha > 0.5

    # Depth on the person over a neutral grey (no background to confuse it).
    grey = Image.new("RGB", rgba.size, (128, 128, 128))
    grey.paste(rgba, mask=rgba.getchannel("A"))
    disp = estimate_depth(grey)

    # Normalise inside the person only (robust 2nd–98th percentile).
    lo, hi = np.percentile(disp[mask], [2, 98])
    depth = np.clip((disp - lo) / max(hi - lo, 1e-6), 0, 1)
    depth[~mask] = 0.0
    depth_img = Image.fromarray((depth * 255).astype(np.uint8), "L").filter(
        ImageFilter.GaussianBlur(radius=max(w, h) / 300)
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    depth_img.save(OUT_DIR / "depth.webp", "WEBP", quality=90)

    # Particles: pixels of the person, weighted towards opaque, detailed areas.
    rgb = np.asarray(rgba.convert("RGB"), dtype=np.float32) / 255.0
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    gy, gx = np.gradient(lum)
    detail = np.sqrt(gx**2 + gy**2)
    weight = alpha * (0.35 + detail / (detail.max() + 1e-6))
    weight[~mask] = 0
    p = weight.ravel() / weight.sum()
    rng = np.random.default_rng(SEED)
    idx = rng.choice(p.size, size=N_POINTS, replace=False, p=p)
    ys, xs = np.divmod(idx, w)
    jitter = rng.random((2, N_POINTS), dtype=np.float32) - 0.5
    u = (xs + 0.5 + jitter[0]) / w  # 0..1 left→right
    v = (ys + 0.5 + jitter[1]) / h  # 0..1 top→bottom
    d_small = np.asarray(depth_img, dtype=np.float32) / 255.0
    z = d_small[ys, xs]
    col = rgb[ys, xs]
    # Lift dark clothing a little so particles glow instead of vanishing.
    col = np.clip(col * 1.15 + 0.06, 0, 1)

    data = np.stack([u, v, z, col[:, 0], col[:, 1], col[:, 2]], axis=1).astype("<f4")
    with open(OUT_DIR / "particles.bin", "wb") as f:
        f.write(data.tobytes())

    print(f"depth.webp {depth_img.size}, particles.bin {N_POINTS} points "
          f"({(OUT_DIR / 'particles.bin').stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
