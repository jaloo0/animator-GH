"""Depth maps for Clay Atlas stills: Depth Anything V2 Small (Apache-2.0), run on this computer with onnxruntime.

  SKILL/scripts/py SKILL/scripts/depth.py <stills-folder> [--force]   → <name>_depth.png next to every still
  SKILL/scripts/py SKILL/scripts/depth.py --download                  only fetch the model (~99 MB, once)

Optional: `bash SKILL/scripts/setup.sh --depth` installs it (the model + Pillow, ~0.1 GB). The Clay Atlas example
already ships its depth maps, so you only need this for NEW stills. Output: 8-bit grayscale PNG, near = white,
same size as the still (the WebGL camera reads it as a texture, so 8 bits is all it ever sees).
Same model and preprocessing as the Hugging Face `depth-anything/Depth-Anything-V2-Small-hf` pipeline
(518 px short side, multiple of 14, bicubic, ImageNet mean/std), exported to ONNX by onnx-community.
"""
import argparse, glob, os, sys, urllib.request
from pathlib import Path
import numpy as np

HOME = Path(os.environ.get('FACELESS_HOME', Path.home() / '.faceless-videos'))
MODEL = HOME / 'depth' / 'depth-anything-v2-small.onnx'
URL = 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx'
MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)


def ensure_model():
    if MODEL.exists() and MODEL.stat().st_size > 50_000_000:
        return
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    print('downloading Depth Anything V2 Small (ONNX, ~99 MB, once)…', flush=True)
    tmp = MODEL.with_suffix('.part')
    urllib.request.urlretrieve(URL, tmp)
    tmp.rename(MODEL)


def net_size(h, w, side=518, mult=14):
    """DPTImageProcessor(keep_aspect_ratio=True, ensure_multiple_of=14): scale by the factor closest to 1"""
    sh, sw = side / h, side / w
    if abs(1 - sw) < abs(1 - sh): sh = sw
    else: sw = sh
    c = lambda v: max(mult, int(round(v / mult)) * mult)
    return c(sh * h), c(sw * w)


def depth_of(sess, name, path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    W, H = im.size
    nh, nw = net_size(H, W)
    x = np.asarray(im.resize((nw, nh), Image.BICUBIC), np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {name: x})[0]
    d = np.asarray(d, np.float32).reshape(d.shape[-2], d.shape[-1])
    d = np.asarray(Image.fromarray(d, mode='F').resize((W, H), Image.BICUBIC), np.float32)
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    return Image.fromarray(np.clip(d * 255 + 0.5, 0, 255).astype(np.uint8), mode='L')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder', nargs='?')
    ap.add_argument('--force', action='store_true', help='redo stills that already have a _depth.png')
    ap.add_argument('--download', action='store_true')
    a = ap.parse_args()
    try:
        import PIL, onnxruntime  # noqa: F401
    except ImportError:
        sys.exit('depth maps need the optional step:  bash SKILL/scripts/setup.sh --depth')
    ensure_model()
    if a.download:
        print('model ok:', MODEL); return
    if not a.folder:
        sys.exit('usage: depth.py <stills-folder> [--force]')
    import onnxruntime as ort
    sess = ort.InferenceSession(str(MODEL), providers=['CPUExecutionProvider'])
    name = sess.get_inputs()[0].name
    files = sorted(f for ext in ('jpg', 'jpeg', 'png', 'webp') for f in glob.glob(os.path.join(a.folder, f'*.{ext}')))
    todo = [f for f in files if '_depth' not in os.path.basename(f)]
    if not todo:
        sys.exit(f'no stills (.jpg/.png/.webp) in {a.folder}')
    for f in todo:
        out = os.path.splitext(f)[0] + '_depth.png'
        if os.path.exists(out) and not a.force:
            print('keep ', out); continue
        depth_of(sess, name, f).save(out)
        print('depth', out, flush=True)


if __name__ == '__main__':
    main()
