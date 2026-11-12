#!/usr/bin/env python3
# prep_v5.py <landing.html>
# Pulls the three illustrations + the bridge video out of the landing HTML (they are embedded as base64)
# and builds the working plates the page uses. Everything lands in work/ (not committed; regenerate any time).
# High-res swap: put replacements in assets/hires/ (intro.png|jpg, closing.png|jpg, bridge.mp4) and re-run.
import re, sys, os, base64, glob, shutil, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work'); SRC = os.path.join(W, 'src')
os.makedirs(SRC, exist_ok=True)
s = open(sys.argv[1], encoding='utf-8').read()
imgs = re.findall(r'url\("data:image/jpeg;base64,([A-Za-z0-9+/=]+)"\)', s)
assert len(imgs) == 3, 'expected 3 embedded illustrations (intro, bridge poster, closing), found %d' % len(imgs)
for name, b in zip(('intro', 'bridge_poster', 'closing'), imgs):
    open(os.path.join(SRC, name + '.jpg'), 'wb').write(base64.b64decode(b))
m = re.search(r'id="bVidData">([^<]+)<', s); assert m, 'bridge video (#bVidData) not found'
open(os.path.join(SRC, 'bridge.mp4'), 'wb').write(base64.b64decode(m.group(1).strip()))

def pick(name, exts):
    for e in exts:
        p = os.path.join(HERE, 'assets', 'hires', name + '.' + e)
        if os.path.exists(p): print('using high-res override:', os.path.relpath(p, HERE)); return p
    return os.path.join(SRC, name + ('.mp4' if 'mp4' in exts else '.jpg'))

def fit(path, size, label):
    im = Image.open(path).convert('RGB'); w, h = im.size
    if abs(w / h - size[0] / size[1]) > 0.01:
        print('WARNING: %s is %dx%d, a different shape from the original (%.3f vs %.3f). It will be centre-cropped; check the framing numbers in render_v5.js.' % (label, w, h, w / h, size[0] / size[1]))
        k = max(size[0] / w, size[1] / h); im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        l = (im.size[0] - size[0]) // 2; t = (im.size[1] - size[1]) // 2; return im.crop((l, t, l + size[0], t + size[1]))
    print('%s: source %dx%d -> working %dx%d (%s)' % (label, w, h, size[0], size[1], 'UPSCALED, soft' if w < size[0] else 'downscaled, sharp'))
    return im.resize(size, Image.LANCZOS)

# intro/question plate: the intro illustration (474x843 in the landing) at 4x, tiled mirror|original|mirror so a 16:9 window fits
a = fit(pick('intro', ('png', 'jpg', 'jpeg')), (1896, 3372), 'intro illustration'); f = a.transpose(Image.FLIP_LEFT_RIGHT)
p = Image.new('RGB', (1896 * 3, 3372)); p.paste(f, (0, 0)); p.paste(a, (1896, 0)); p.paste(f, (3792, 0)); p.save(os.path.join(W, 'plate3.jpg'), quality=92)
# closing/end-card plate: the closing illustration (800x1235 in the landing) at 2.4x = full 1920 width
fit(pick('closing', ('png', 'jpg', 'jpeg')), (1920, 2964), 'closing illustration').save(os.path.join(W, 'img2_up.jpg'), quality=92)
# bridge video (720x1280, 30fps, 331 frames in the landing) -> stills at 2x, plus 30 cross-faded frames so it loops without a jump
vf = os.path.join(W, 'vf'); shutil.rmtree(vf, ignore_errors=True); os.makedirs(vf)
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', pick('bridge', ('mp4',)), '-vf', 'fps=30,scale=1440:2560:flags=lanczos', '-q:v', '2', os.path.join(vf, 'f%04d.jpg')])
n = len(glob.glob(os.path.join(vf, 'f*.jpg'))); assert n >= 331, 'bridge video too short: %d frames (need 331)' % n
for j in range(1, 31):
    x = Image.blend(Image.open(os.path.join(vf, 'f%04d.jpg' % (301 + j))), Image.open(os.path.join(vf, 'f%04d.jpg' % j)), j / 31)
    x.save(os.path.join(vf, 'x%04d.jpg' % j), quality=93)
print('prep ok:', n, 'video frames')
