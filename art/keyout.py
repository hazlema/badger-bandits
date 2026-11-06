import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert('RGB')).astype(int)
lo, hi = rgb.min(2), rgb.max(2)
cand = (lo >= 192) & (hi - lo <= 18)  # the painted checkerboard: light, near-grey

def dilate(m):
    d = m.copy()
    d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    return d

bg = np.zeros_like(cand)
bg[0, :] = cand[0, :]; bg[-1, :] = cand[-1, :]; bg[:, 0] = cand[:, 0]; bg[:, -1] = cand[:, -1]
while True:
    nxt = dilate(bg) & cand
    if (nxt == bg).all():
        break
    bg = nxt
bg = dilate(bg)  # eat the one-pixel light fringe the painting leaves at the edge

alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
out = Image.fromarray(rgb.astype(np.uint8)).convert('RGBA')
out.putalpha(alpha)
out.save(dst, optimize=True)
print('background removed: %.1f%%' % (100 * bg.mean()))
