from pathlib import Path
from PIL import Image

project = Path(__file__).resolve().parents[1]
source = project / "assets" / "Yoldas_brand_mark.png"
target = project / "assets" / "Yoldas_nav_logo_trimmed.png"

image = Image.open(source).convert("RGBA")
alpha = image.getchannel("A")
bbox = alpha.getbbox()
if bbox is None:
    raise RuntimeError("Brand mark has no visible pixels")

pad = 18
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(image.width, bbox[2] + pad)
bottom = min(image.height, bbox[3] + pad)
image.crop((left, top, right, bottom)).save(target, "PNG")
print(f"Saved trimmed logo: {target}")
