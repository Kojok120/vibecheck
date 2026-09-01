from PIL import Image, ImageDraw

W = 512

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

c0, c1 = (0x8B, 0x5C, 0xF6), (0x5B, 0x5B, 0xD6)
grad = Image.new("RGB", (W, W))
px = grad.load()
for y in range(W):
    for x in range(W):
        px[x, y] = lerp(c0, c1, (x + y) / (2 * (W - 1)))

mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=round(W * 28 / 128), fill=255)
img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)
white = (255, 255, 255, 255)
u = W / 128.0
x0 = y0 = 30 * u
x1 = y1 = W - x0
r, L, w = 14 * u, 8 * u, 10 * u

def cap(p):
    d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=white)

def seg(a, b):
    d.line([a, b], fill=white, width=round(w))
    cap(a)
    cap(b)

def corner(cx, cy, edge_x, edge_y, sx, sy, a0, a1):
    hw = w / 2
    d.arc([cx - r - hw, cy - r - hw, cx + r + hw, cy + r + hw], a0, a1, fill=white, width=round(w))
    seg((cx, edge_y), (cx + sx * L, edge_y))
    seg((edge_x, cy), (edge_x, cy + sy * L))

corner(x0 + r, y0 + r, x0, y0, +1, +1, 180, 270)   # top-left
corner(x1 - r, y0 + r, x1, y0, -1, +1, 270, 360)   # top-right
corner(x1 - r, y1 - r, x1, y1, -1, -1, 0, 90)      # bottom-right
corner(x0 + r, y1 - r, x0, y1, +1, -1, 90, 180)    # bottom-left

cr = 10 * u
d.ellipse([W / 2 - cr, W / 2 - cr, W / 2 + cr, W / 2 + cr], fill=(0xF9, 0xA8, 0xD4, 255))

for s in (16, 32, 48, 96, 128):
    img.resize((s, s), Image.LANCZOS).save(f"src/public/icon/{s}.png")
img.resize((256, 256), Image.LANCZOS).save("assets/icon-preview.png")
print("done")
