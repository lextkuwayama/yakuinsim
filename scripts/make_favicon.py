from pathlib import Path
import re
from PIL import Image
import vtracer

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp-logo" / "prolext-favicon-src.png"
OUT = ROOT / "public"


def main() -> None:
    svg_path = OUT / "prolext-mark-gold.svg"
    vtracer.convert_image_to_svg_py(
        str(SRC),
        str(svg_path),
        colormode="color",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=2,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=3,
    )
    svg = svg_path.read_text(encoding="utf-8")
    fills = sorted(set(re.findall(r'fill="(#[A-Fa-f0-9]{3,8}|[a-zA-Z]+)"', svg)))
    print("fills before", fills)

    parts = re.split(r"(<path\b[^>]*/>)", svg)
    cleaned: list[str] = []
    for part in parts:
        if part.startswith("<path"):
            fill_match = re.search(r'fill="([^"]+)"', part)
            fill = (fill_match.group(1) if fill_match else "").lower()
            if fill in {"#000", "#000000", "black"}:
                continue
        cleaned.append(part)
    svg = "".join(cleaned)
    # Ensure transparent background viewBox.
    if 'viewBox="' not in svg:
        svg = svg.replace(
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="292" height="292">',
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="292" height="292" viewBox="0 0 292 292">',
            1,
        )
    svg_path.write_text(svg, encoding="utf-8")
    fills = sorted(set(re.findall(r'fill="(#[A-Fa-f0-9]{3,8}|[a-zA-Z]+)"', svg)))
    print("fills after", fills)

    # Header mark / favicons: gold on transparent (no black fill).
    mark = Image.open(SRC).convert("RGBA")
    Image.open(SRC).convert("RGBA").save(OUT / "prolext-mark-gold-v2.png", format="PNG", optimize=True)

    for name, size in [
        ("favicon.png", 64),
        ("favicon-32.png", 32),
        ("icon-512.png", 512),
    ]:
        mark.resize((size, size), Image.Resampling.LANCZOS).save(
            OUT / name, format="PNG", optimize=True
        )

    # Apple touch icons prefer an opaque backdrop.
    apple = Image.new("RGBA", (180, 180), (0, 0, 0, 255))
    apple.alpha_composite(mark.resize((180, 180), Image.Resampling.LANCZOS))
    apple.save(OUT / "apple-touch-icon.png", format="PNG", optimize=True)

    sizes = [(16, 16), (32, 32), (48, 48)]
    imgs = [mark.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    imgs[0].save(OUT / "favicon.ico", format="ICO", sizes=sizes, append_images=imgs[1:])
    print("done")


if __name__ == "__main__":
    main()
