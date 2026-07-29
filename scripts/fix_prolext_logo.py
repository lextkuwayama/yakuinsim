"""Convert PROLEXT logo: black bg -> transparent via flood-fill, keep gold, text -> black."""

from collections import deque
from PIL import Image

SRC = r"c:\Users\yasuh\Desktop\sim-officer-comp\public\prolext-logo.png"

img = Image.open(SRC).convert("RGBA")
pixels = img.load()
w, h = img.size


def is_bg_candidate(r: int, g: int, b: int, a: int) -> bool:
    if a < 10:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    sat = max(r, g, b) - min(r, g, b)
    return lum < 35 and sat < 30


def is_gold(r: int, g: int, b: int) -> bool:
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return r > 140 and g > 100 and b < 120 and (r + g) > b * 2.2 and lum > 90


# Flood-fill near-black connected to the border -> mark as background
bg = [[False] * w for _ in range(h)]
q: deque[tuple[int, int]] = deque()

for x in range(w):
    for y in (0, h - 1):
        r, g, b, a = pixels[x, y]
        if is_bg_candidate(r, g, b, a) and not is_gold(r, g, b):
            bg[y][x] = True
            q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        r, g, b, a = pixels[x, y]
        if is_bg_candidate(r, g, b, a) and not is_gold(r, g, b) and not bg[y][x]:
            bg[y][x] = True
            q.append((x, y))

while q:
    x, y = q.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if nx < 0 or ny < 0 or nx >= w or ny >= h or bg[ny][nx]:
            continue
        r, g, b, a = pixels[nx, ny]
        if is_gold(r, g, b):
            continue
        if is_bg_candidate(r, g, b, a):
            bg[ny][nx] = True
            q.append((nx, ny))

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if bg[y][x]:
            pixels[x, y] = (0, 0, 0, 0)
            continue
        if is_gold(r, g, b):
            continue
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        sat = max(r, g, b) - min(r, g, b)
        if lum < 100 and sat < 60:
            pixels[x, y] = (20, 18, 16, 255)

gold = dark = trans = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            trans += 1
        elif is_gold(r, g, b):
            gold += 1
        elif r < 50 and g < 50 and b < 50:
            dark += 1

print(f"size={w}x{h} gold={gold} dark={dark} trans={trans}")
img.save(SRC)
print("saved", SRC)
