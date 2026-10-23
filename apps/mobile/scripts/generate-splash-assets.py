"""Original splash drawings for KHomeEasy.

These are KHomeEasy line symbols for device kinds. They are not KNX Association
logo artwork and not copies from the KNX media library.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "splash" / "glyphs"
FIELD = ROOT / "assets" / "splash" / "field.png"
IOS_ASSETS = ROOT / "ios" / "KHomeEasy" / "Images.xcassets"
LOGO = ROOT / "assets" / "logo.png"

NAVY = (11, 28, 51, 255)
PLAN = (176, 212, 237, 230)
WHITE = (255, 255, 255, 255)
GREEN = (46, 158, 78, 255)
PALE = (198, 216, 228, 255)
AMBER = (204, 140, 56, 255)

SIZE = 256
FRAMES = {
    "lamp": "solid",
    "dimmer": "solid",
    "rocker": "dashed",
    "blind": "solid",
    "thermostat": "solid",
    "radiator": "dashed",
    "motion": "triangle",
    "thermometer": "solid",
    "weather": "dashed",
    "window": "triangle",
    "lock": "solid",
    "air": "dashed",
    "panel": "solid",
    "socket": "triangle",
}


def dashed_oval(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: tuple[int, int, int, int]) -> None:
    dashes = 16
    span = 360 / dashes
    for index in range(dashes):
        if index % 2 == 0:
            start = index * span - 90
            draw.arc(box, start=start, end=start + span * 0.55, fill=color, width=8)


def frame(draw: ImageDraw.ImageDraw, kind: str) -> None:
    box = (18, 18, SIZE - 18, SIZE - 18)
    if kind == "solid":
        draw.ellipse(box, outline=GREEN, width=8)
    elif kind == "dashed":
        dashed_oval(draw, box, PALE)
    else:
        mid = SIZE / 2
        points = [(mid, 22), (SIZE - 22, SIZE - 24), (22, SIZE - 24), (mid, 22)]
        draw.line(points, fill=AMBER, width=8, joint="curve")


def icon_draw(name: str, draw: ImageDraw.ImageDraw) -> None:
    if name == "lamp":
        draw.ellipse((88, 58, 168, 138), outline=WHITE, width=7)
        draw.rounded_rectangle((108, 136, 148, 156), radius=4, outline=WHITE, width=6)
        draw.rounded_rectangle((96, 156, 160, 196), radius=6, outline=WHITE, width=7)
        draw.line([(104, 168), (152, 168)], fill=WHITE, width=5)
        draw.line([(104, 180), (152, 180)], fill=WHITE, width=5)
    elif name == "dimmer":
        draw.ellipse((74, 74, 182, 182), outline=WHITE, width=7)
        for degree in range(-120, 121, 30):
            rad = math.radians(degree - 90)
            draw.line(
                [
                    (128 + math.cos(rad) * 34, 128 + math.sin(rad) * 34),
                    (128 + math.cos(rad) * 46, 128 + math.sin(rad) * 46),
                ],
                fill=WHITE,
                width=5,
            )
        draw.ellipse((110, 110, 146, 146), outline=WHITE, width=6)
        draw.line([(128, 128), (154, 102)], fill=WHITE, width=6)
    elif name == "rocker":
        draw.rounded_rectangle((86, 48, 170, 208), radius=12, outline=WHITE, width=7)
        draw.rounded_rectangle((98, 62, 128, 194), radius=6, outline=WHITE, width=6)
        draw.rounded_rectangle((136, 62, 158, 194), radius=6, outline=WHITE, width=6)
    elif name == "blind":
        draw.rounded_rectangle((78, 62, 164, 190), radius=4, outline=WHITE, width=7)
        for top in (80, 102, 124, 146, 168):
            draw.line([(90, top), (152, top)], fill=WHITE, width=5)
        draw.line([(176, 62), (176, 118)], fill=WHITE, width=5)
        draw.ellipse((166, 112, 186, 132), outline=WHITE, width=5)
    elif name == "thermostat":
        draw.ellipse((70, 70, 186, 186), outline=WHITE, width=7)
        draw.ellipse((100, 100, 156, 156), outline=WHITE, width=6)
        draw.line([(128, 128), (128, 92)], fill=WHITE, width=6)
        draw.line([(128, 128), (154, 146)], fill=WHITE, width=6)
    elif name == "radiator":
        draw.line([(78, 78), (178, 78)], fill=WHITE, width=7)
        draw.line([(78, 178), (178, 178)], fill=WHITE, width=7)
        for left in (88, 110, 132, 154):
            draw.line([(left, 78), (left, 178)], fill=WHITE, width=6)
        draw.line([(168, 96), (196, 96)], fill=WHITE, width=5)
        draw.ellipse((190, 88, 206, 104), outline=WHITE, width=4)
    elif name == "motion":
        draw.ellipse((104, 146, 152, 194), outline=WHITE, width=7)
        draw.arc((72, 108, 184, 196), start=210, end=330, fill=WHITE, width=7)
        draw.arc((52, 82, 204, 196), start=214, end=326, fill=WHITE, width=6)
    elif name == "thermometer":
        draw.rounded_rectangle((112, 52, 144, 168), radius=16, outline=WHITE, width=7)
        draw.ellipse((96, 148, 160, 212), outline=WHITE, width=7)
        draw.line([(128, 84), (128, 156)], fill=WHITE, width=6)
    elif name == "weather":
        draw.ellipse((62, 62, 110, 110), outline=WHITE, width=6)
        for degree in range(0, 360, 45):
            rad = math.radians(degree)
            draw.line(
                [
                    (86 + math.cos(rad) * 28, 86 + math.sin(rad) * 28),
                    (86 + math.cos(rad) * 40, 86 + math.sin(rad) * 40),
                ],
                fill=WHITE,
                width=4,
            )
        draw.arc((108, 112, 198, 176), start=200, end=340, fill=WHITE, width=7)
        draw.ellipse((118, 100, 162, 144), outline=WHITE, width=6)
        for rain_x in (126, 152, 178):
            draw.line([(rain_x, 168), (rain_x - 8, 190)], fill=WHITE, width=5)
    elif name == "window":
        draw.rounded_rectangle((74, 58, 182, 186), radius=6, outline=WHITE, width=7)
        draw.line([(128, 58), (128, 186)], fill=WHITE, width=6)
        draw.line([(74, 122), (182, 122)], fill=WHITE, width=6)
        draw.ellipse((168, 112, 188, 132), outline=WHITE, width=5)
    elif name == "lock":
        draw.arc((96, 58, 160, 128), start=200, end=340, fill=WHITE, width=8)
        draw.rounded_rectangle((84, 112, 172, 198), radius=12, outline=WHITE, width=7)
        draw.ellipse((116, 136, 140, 160), outline=WHITE, width=6)
        draw.line([(128, 156), (128, 178)], fill=WHITE, width=6)
    elif name == "air":
        for row, amplitude in ((96, 8), (128, 12), (160, 8)):
            points = [
                (70 + step * 14, row + math.sin(step * 0.9) * amplitude) for step in range(9)
            ]
            draw.line(points, fill=WHITE, width=6, joint="curve")
    elif name == "panel":
        draw.rounded_rectangle((70, 64, 186, 192), radius=14, outline=WHITE, width=7)
        for left in (88, 136):
            for top in (84, 132):
                draw.rounded_rectangle((left, top, left + 32, top + 32), radius=6, outline=WHITE, width=5)
    else:
        draw.rounded_rectangle((78, 78, 178, 186), radius=16, outline=WHITE, width=7)
        draw.ellipse((104, 108, 128, 132), outline=WHITE, width=6)
        draw.ellipse((136, 108, 160, 132), outline=WHITE, width=6)
        draw.line([(128, 148), (128, 168)], fill=WHITE, width=6)


def glyph(name: str) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    frame(draw, FRAMES[name])
    icon_draw(name, draw)
    return image


def floor_plan(width: int, height: int) -> Image.Image:
    layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    left = int(width * 0.12)
    top = int(height * 0.12)
    plan_w = int(width * 0.76)
    plan_h = int(height * 0.76)

    def at(x: float, y: float) -> tuple[int, int]:
        return (left + int(plan_w * x), top + int(plan_h * y))

    def wall(x1: float, y1: float, x2: float, y2: float) -> None:
        draw.line([at(x1, y1), at(x2, y2)], fill=PLAN, width=10)

    wall(0, 0.04, 0, 1)
    wall(0, 0, 0.40, 0)
    wall(0.52, 0, 1, 0)
    wall(1, 0, 1, 0.62)
    wall(1, 0.74, 1, 1)
    wall(1, 1, 0.22, 1)
    wall(0.08, 1, 0, 1)
    wall(0, 0.28, 0.32, 0.28)
    wall(0.44, 0.28, 1, 0.28)
    wall(0.36, 0, 0.36, 0.16)
    wall(0.68, 0.04, 0.68, 0.28)
    wall(0.56, 0.28, 0.56, 0.46)
    wall(0.56, 0.58, 0.56, 0.74)
    wall(0, 0.74, 0.24, 0.74)
    wall(0.36, 0.74, 1, 0.74)
    wall(0.30, 0.74, 0.30, 0.92)
    wall(0.74, 0.74, 0.74, 1)
    wall(0.64, 0.40, 0.90, 0.40)
    wall(0.90, 0.40, 0.90, 0.62)
    wall(0.64, 0.62, 0.90, 0.62)
    oval = at(0.08, 0.38)
    draw.ellipse((oval[0], oval[1], oval[0] + int(plan_w * 0.28), oval[1] + int(plan_h * 0.16)), outline=PLAN, width=8)
    table = at(0.82, 0.14)
    diameter = int(plan_w * 0.12)
    draw.ellipse((table[0] - diameter // 2, table[1] - diameter // 2, table[0] + diameter // 2, table[1] + diameter // 2), outline=PLAN, width=8)
    for step in range(5):
        y = 0.80 + step * 0.028
        wall(0.05, y, 0.22, y)
    door = at(0.40, 0)
    draw.arc((door[0] - 70, door[1] - 70, door[0] + 70, door[1] + 70), start=0, end=90, fill=PLAN, width=6)
    return layer.filter(ImageFilter.GaussianBlur(radius=16))


def write_imageset(name: str, filename: str, source: Path) -> None:
    folder = IOS_ASSETS / f"{name}.imageset"
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, folder / filename)
    (folder / "Contents.json").write_text(
        "{\n"
        '  "images" : [\n'
        "    {\n"
        f'      "filename" : "{filename}",\n'
        '      "idiom" : "universal"\n'
        "    }\n"
        "  ],\n"
        '  "info" : {\n'
        '    "author" : "xcode",\n'
        '    "version" : 1\n'
        "  }\n"
        "}\n",
        encoding="utf-8",
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in FRAMES:
        glyph(name).save(OUT / f"{name}.png")

    width, height = 1290, 2796
    field = Image.new("RGBA", (width, height), NAVY)
    field.alpha_composite(floor_plan(width, height))
    field.save(FIELD)

    logo = Image.open(LOGO).convert("RGBA")
    side = int(width * 0.32)
    logo = logo.resize((side, side), Image.Resampling.LANCZOS)
    preview = field.copy()
    preview.alpha_composite(logo, ((width - side) // 2, int(height * 0.46) - side // 2))
    preview_path = Path("/tmp/khe-splash-preview.png")
    preview.resize((430, 932), Image.Resampling.LANCZOS).save(preview_path)

    sheet = Image.new("RGBA", (SIZE * 7, SIZE * 2), NAVY)
    for index, name in enumerate(FRAMES):
        icon = Image.open(OUT / f"{name}.png")
        column = index % 7
        row = index // 7
        sheet.alpha_composite(icon, (column * SIZE, row * SIZE))
    sheet.resize((sheet.width // 2, sheet.height // 2), Image.Resampling.LANCZOS).save("/tmp/khe-splash-glyphs.png")

    write_imageset("SplashField", "SplashField.png", FIELD)
    write_imageset("SplashLogo", "SplashLogo.png", LOGO)
    print(f"wrote {FIELD} and {len(FRAMES)} glyphs")


if __name__ == "__main__":
    main()
