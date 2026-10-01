"""Encode tools/devices/out/*.png to assets/dev-*.webp."""
import glob, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', '..', 'assets')
total = 0
for p in sorted(glob.glob(os.path.join(HERE, 'out', '*.png'))):
    name = 'dev-' + os.path.splitext(os.path.basename(p))[0] + '.webp'
    dst = os.path.join(ASSETS, name)
    Image.open(p).convert('RGB').save(dst, 'WEBP', quality=80, method=6)
    total += os.path.getsize(dst)
    print(f'  {name:<22} {Image.open(p).size}  {os.path.getsize(dst)/1024:6.1f} KB')
print(f'  total {total/1024:.0f} KB')
