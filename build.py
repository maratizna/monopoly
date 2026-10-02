#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборщик «Бизнес-Сити — 3D»: src/ -> монополия полный код.html (single-file).

    python3 build.py            # собрать dist-файл из src/
    python3 build.py --check    # drift-check (CI): сверить dist c src/, ничего не писать
"""
import io, os, sys

NL = chr(10)

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "монополия полный код.html")

# Порядок склейки ВАЖЕН: все модули живут в одной общей области видимости одного <script>.
JS_ORDER = [
    "00-utils.js",  # утилиты $/sleep/clamp/shuffle, store, showFatal
    "01-sound.js",  # звук + амбиент (Web Audio API)
    "02-data.js",  # данные поля, карты Шанс/Казна/Тень
    "03-settings.js",  # настройки, слоты, гиды, карьера, онбординг
    "04-core.js",  # чистое ядро правил + экономика эр + юнит-тесты
    "05-scene.js",  # 3D: текстуры, частицы, кино-камера, биржа, камера
    "06-hud.js",  # HUD: лог, тосты, карточки игроков
    "07-modals.js",  # модальные окна (клетка, игрок, статистика)
    "08-game-loop.js",  # игровой цикл: ход, тюрьма, банкротство, победа
    "09-auction.js",  # аукцион и тендер (+ память ИИ)
    "10-assets.js",  # строительство, активы, торговля
    "11-ai.js",  # боты (покупка/стройка/трейд)
    "12-saves.js",  # сохранения: слоты, экспорт/импорт
    "13-menu.js",  # меню/лобби/настройки + handleAct
    "14-boot.js",  # bindUI, boot()
]

def read(p):
    with io.open(p, encoding="utf-8") as f:
        return f.read().rstrip("\n")

def main():
    check = "--check" in sys.argv
    css = read(os.path.join(SRC, "css", "style.css"))
    body = read(os.path.join(SRC, "html", "body.html"))
    parts = []
    for name in JS_ORDER:
        p = os.path.join(SRC, "js", name)
        if not os.path.exists(p):
            sys.exit("Отсутствует модуль: src/js/" + name)
        code = read(p)
        if "</scr" + "ipt>" in code:
            sys.exit("В " + name + " встречается закрывающий тег скрипта — сломает single-file сборку")
        parts.append(code)
    # Разделители как в исходном single-file: перед каждой секцией — одна пустая
    # строка; перед utils (после 'use strict') и перед СТАРТОМ (14) — по две.
    js = ("\n\n" + parts[0]
          + "\n".join("\n" + p for p in parts[1:-1])
          + "\n\n" + parts[-1])
    head = read(os.path.join(SRC, "head.html"))   # <!DOCTYPE ... <style>
    mid = read(os.path.join(SRC, "mid.html"))     # </style></head><body>
    three = read(os.path.join(SRC, "three.html")) # CDN Three.js x3 + открывающий <script>
    tail = read(os.path.join(SRC, "tail.html"))   # </script></body></html>
    out = (head + "\n<style>" + NL + css + "\n" + mid + "\n" + body + "\n\n"
           + three + js + NL + tail)

    if check:
        cur = read(OUT) if os.path.exists(OUT) else ""
        if cur != out.rstrip("\n"):
            sys.exit("DRIFT: dist не соответствует src/. Запустите: python3 build.py")
        print("OK: dist актуален, расхождений с src/ нет.")
        return
    with io.open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write(out.replace("\n", "\r\n"))  # dist в CRLF — как оригинал (меньше шума в git diff)
    print("Собрано: %s (%d строк)" % (os.path.basename(OUT), out.count("\n") + 1))

if __name__ == "__main__":
    main()
