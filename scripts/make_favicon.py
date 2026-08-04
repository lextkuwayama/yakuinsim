from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\yasuh\.cursor\projects\c-Users-yasuh-Desktop-sim-officer-comp\assets"
    r"\c__Users_yasuh_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"4e312e5e063ff6ab892ddb58758b3731_images_______-dd5a2c33-cc06-43a4-b13b-95c747430252.png"
)
OUT_DIR = Path(__file__).resolve().parents[1] / "public"


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    print("source", img.size)

    pixels = img.load()
    w, h = img.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            if r + g + b > 80:
                xs.append(x)
                ys.append(y)

    if not xs:
        raise SystemExit("no logo pixels found")

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    print("bbox", min_x, min_y, max_x, max_y)

    pad = int(max(max_x - min_x, max_y - min_y) * 0.12)
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(w - 1, max_x + pad)
    max_y = min(h - 1, max_y + pad)
    crop = img.crop((min_x, min_y, max_x + 1, max_y + 1))

    cw, ch = crop.size
    side = max(cw, ch)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 255))
    square.paste(crop, ((side - cw) // 2, (side - ch) // 2), crop)

    def save_png(im: Image.Image, path: Path, size: int) -> None:
        out = im.resize((size, size), Image.Resampling.LANCZOS)
        out.save(path, format="PNG", optimize=True)
        print("wrote", path.name, size)

    save_png(square, OUT_DIR / "favicon.png", 64)
    save_png(square, OUT_DIR / "favicon-32.png", 32)
    save_png(square, OUT_DIR / "apple-touch-icon.png", 180)
    save_png(square, OUT_DIR / "icon-512.png", 512)

    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [square.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_images[0].save(
        OUT_DIR / "favicon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:],
    )
    print("wrote favicon.ico")


if __name__ == "__main__":
    main()
