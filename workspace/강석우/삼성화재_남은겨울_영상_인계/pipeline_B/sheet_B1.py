# sheet_B1.py <frames_dir> <out.jpg> <t1> <t2> ...  -> contact sheet of the frames nearest to the given times (3 per row), for checking
import sys, os, glob
from PIL import Image, ImageDraw
d, out, ts = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:]]
fs = sorted(glob.glob(os.path.join(d, '*.jpg'))); idx = [int(os.path.basename(f)[:5]) for f in fs]
W, H, C = 640, 360, 3; S = Image.new('RGB', (W * C, H * ((len(ts) + C - 1) // C)))
for k, t in enumerate(ts):
    j = min(range(len(idx)), key=lambda i: abs(idx[i] - t * 30)); im = Image.open(fs[j]).resize((W, H), Image.LANCZOS)
    ImageDraw.Draw(im).text((8, 6), '%.2fs' % (idx[j] / 30), fill=(255, 255, 0)); S.paste(im, (k % C * W, k // C * H))
S.save(out, quality=88)
