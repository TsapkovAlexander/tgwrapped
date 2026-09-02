#!/usr/bin/env python3
"""Собирает app/og.png (1200×630) — превью ссылки в Telegram и соцсетях.

Текст переводится в кривые прямо из woff2 проекта: librsvg на macOS берёт шрифты
через CoreText и не видит ни fontconfig, ни @font-face, а ставить шрифты в систему
ради картинки незачем. Кривые дают ту же типографику и не зависят от машины.
"""
import pathlib, subprocess, tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / "app" / "fonts"
OUT = ROOT / "app" / "og.png"

INK, PAPER, CREAM, PEACH, MUTE, DIM, CORAL = "#1F1D1B", "#FBFAF7", "#F4F0E8", "#F7E8E1", "#6F6A64", "#A8A29A", "#D9694F"

def load(name, weight):
    f = TTFont(str(FONTS / f"{name}.woff2"))
    f.flavor = None
    return instancer.instantiateVariableFont(f, {"wght": weight})

class Type:
    """Набор шрифтов одного веса: кириллица, латиница и цифры Gluten."""
    def __init__(self, weight):
        self.faces = [load("nunito-cyrillic", weight), load("nunito-latin", weight)]
        self.num = load("gluten-num", min(weight, 700))

    def face_for(self, ch, digits_gluten):
        if digits_gluten and (ch.isdigit() or ch == " "):
            if ord(ch) in self.num.getBestCmap():
                return self.num
        for f in self.faces:
            if ord(ch) in f.getBestCmap():
                return f
        return self.faces[0]

    def draw(self, text, x, y, size, fill=INK, tracking=0.0, digits_gluten=True):
        out, cursor = [], x
        for ch in text:
            f = self.face_for(ch, digits_gluten)
            upem = f["head"].unitsPerEm
            scale = size / upem
            gname = f.getBestCmap().get(ord(ch))
            if gname is None:
                cursor += size * 0.3
                continue
            gs = f.getGlyphSet()
            pen = SVGPathPen(gs)
            gs[gname].draw(pen)
            d = pen.getCommands()
            if d:
                out.append(f'<path d="{d}" fill="{fill}" '
                           f'transform="translate({cursor:.2f} {y:.2f}) scale({scale:.5f} {-scale:.5f})"/>')
            cursor += gs[gname].width * scale + tracking
        return "\n".join(out), cursor - x

T5, T6, T8 = Type(500), Type(600), Type(800)

def build():
    p = []
    p.append(f'<rect width="1200" height="630" fill="{PAPER}"/>')
    # три карточки справа — намёк на то, что получит пользователь
    p.append(f'<rect x="700" y="96" width="150" height="267" rx="18" fill="{CREAM}"/>')
    p.append(f'<rect x="866" y="60" width="150" height="267" rx="18" fill="{INK}"/>')
    p.append(f'<rect x="1032" y="96" width="150" height="267" rx="18" fill="{PEACH}"/>')
    p.append(T6.draw("ЛЕНА И ДИМА", 724, 148, 13, MUTE, tracking=1.1)[0])
    p.append(T8.draw("34 727", 724, 296, 34, INK)[0])
    p.append(T5.draw("сообщений", 724, 324, 14, MUTE)[0])
    p.append(T6.draw("ОТВЕТ", 890, 112, 13, DIM, tracking=1.1)[0])
    p.append(T8.draw("31", 890, 268, 52, PAPER)[0])
    p.append(T5.draw("секунда", 890, 296, 14, DIM)[0])
    p.append(T6.draw("ВЕРДИКТ", 1056, 148, 13, MUTE, tracking=1.1)[0])
    p.append(T8.draw("Говорит", 1056, 288, 22, INK)[0])
    p.append(T8.draw("голосом", 1056, 318, 22, INK)[0])
    # левая колонка
    p.append(T8.draw("tgwrapped", 80, 112, 26, INK)[0])
    p.append(T8.draw("Кто из вас", 80, 252, 74, INK, tracking=-1.6)[0])
    p.append(T8.draw("пишет больше?", 80, 336, 74, INK, tracking=-1.6)[0])
    p.append(T5.draw("Экспорт чата из Telegram — десять карточек", 80, 408, 26, MUTE)[0])
    p.append(T5.draw("про вас двоих. За пару секунд.", 80, 446, 26, MUTE)[0])
    p.append(f'<circle cx="88" cy="508" r="7" fill="{CORAL}"/>')
    p.append(T6.draw("Файл не покидает устройство", 108, 517, 23, INK)[0])
    p.append(T5.draw("tgwrapped.ru", 80, 574, 21, MUTE)[0])
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
            + "\n".join(p) + "</svg>")

with tempfile.TemporaryDirectory() as tmp:
    svg = pathlib.Path(tmp) / "og.svg"
    svg.write_text(build(), encoding="utf-8")
    subprocess.run(["rsvg-convert", "-w", "1200", "-h", "630", "-o", str(OUT), str(svg)], check=True)
print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size/1024:.0f} КБ")
