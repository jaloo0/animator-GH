"""Erase the text an image model drew on a generated map (it adds street / place names even when told not to,
and many are wrong). Dark thin pixels (the lettering) are masked and filled from the parchment around them, so
every label can be drawn in code instead (mapLabel() in src/gfx.js).

  SKILL/scripts/py tools/clean_map.py data/map.png [out=data/map_clean.jpg] [--dark 95] [--grow 2]
      --dark  pixels darker than this (0–255 luminance) count as ink; raise it if faint labels survive
      --grow  how many pixels the ink mask grows (anti-aliased letter edges)
Writes the cleaned map and <out>_mask.png (white = what was erased) so you can check it. Look at both: if real map
lines (rivers, coasts) were dark enough to be erased, lower --dark. Needs only numpy, scipy and ffmpeg.
"""
import argparse, json, subprocess
import numpy as np
from scipy import ndimage


def read(path):
    info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path],
                                     capture_output=True, text=True, check=True).stdout)['streams'][0]
    w, h = info['width'], info['height']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float32)


def write(path, a):
    h, w = a.shape[:2]; fmt = 'gray' if a.ndim == 2 else 'rgb24'
    extra = ['-q:v', '2'] if path.lower().endswith(('.jpg', '.jpeg')) else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', fmt, '-s', f'{w}x{h}', '-i', '-', *extra, path],
                   input=np.clip(a, 0, 255).astype(np.uint8).tobytes(), check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('map'); ap.add_argument('out', nargs='?', default='data/map_clean.jpg')
    ap.add_argument('--dark', type=float, default=95); ap.add_argument('--grow', type=int, default=2)
    a = ap.parse_args()
    img = read(a.map)
    lum = img @ np.array([0.299, 0.587, 0.114], np.float32)
    # ink = clearly darker than the local paper (so dark water / shadows are kept), darker than --dark, and not coloured
    local = ndimage.median_filter(lum[::4, ::4], size=9)
    local = ndimage.zoom(local, (lum.shape[0] / local.shape[0], lum.shape[1] / local.shape[1]), order=1)[:lum.shape[0], :lum.shape[1]]
    chroma = img.max(-1) - img.min(-1)        # lettering is near-neutral; coloured outlines / fills are kept
    ink = (lum < a.dark) & (lum < local - 35) & (chroma < 70)
    ink = ndimage.binary_opening(ink, iterations=1) | ink & ndimage.binary_dilation(ndimage.binary_opening(ink, iterations=1), iterations=3)
    if a.grow: ink = ndimage.binary_dilation(ink, iterations=a.grow)
    keep = (~ink).astype(np.float32)
    out = img.copy()
    for sigma in (2, 5, 12, 30):           # fill from the nearest clean parchment, small holes first
        num = np.stack([ndimage.gaussian_filter(out[..., c] * keep, sigma) for c in range(3)], -1)
        den = ndimage.gaussian_filter(keep, sigma)[..., None]
        fill = num / np.maximum(den, 1e-4)
        hole = (keep < 0.5) & (den[..., 0] > 0.05)
        out[hole] = fill[hole]; keep = np.maximum(keep, hole.astype(np.float32))
    grain = ndimage.gaussian_filter(np.random.default_rng(1).normal(0, 3.0, lum.shape), 0.7)[..., None]
    out[ink] += grain[ink]                 # a little paper grain so the patches don't look airbrushed
    write(a.out, out)
    mpath = a.out.rsplit('.', 1)[0] + '_mask.png'
    write(mpath, ink.astype(np.float32) * 255)
    print(f'{a.out}  ({ink.mean() * 100:.1f}% of pixels erased; check {mpath})')


if __name__ == '__main__':
    main()
