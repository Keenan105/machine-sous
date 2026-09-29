#!/usr/bin/env python3
"""Rassemble le jeu en un seul fichier : COCO-BOUM-a-ouvrir.html (double-clic pour jouer).
   python3 build.py [--fragment chemin]  (--fragment : version sans <html>/<head>, pour une page Artifact)"""
import re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
html = open('index.html', encoding='utf-8').read()
css = open('style.css', encoding='utf-8').read()
js = {f: open(f, encoding='utf-8').read() for f in ['engine.js', 'art.js', 'game.js']}

full = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
for f, code in js.items():
    full = full.replace(f'<script src="{f}"></script>', '<script>\n' + code + '\n</script>')
open('COCO-BOUM-a-ouvrir.html', 'w', encoding='utf-8').write(full)
print('COCO-BOUM-a-ouvrir.html', len(full))

if '--fragment' in sys.argv:
    out = sys.argv[sys.argv.index('--fragment') + 1]
    body = html[html.index('<!--BODY-->') + 11:html.index('<!--/BODY-->')]
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', html).group(1)
    frag = f'<title>Coco Boum!</title>\n<link rel="stylesheet" href="{fonts}">\n<style>\n{css}\n</style>\n{body}\n' + \
        ''.join(f'<script>\n{code}\n</script>\n' for code in js.values())
    open(out, 'w', encoding='utf-8').write(frag)
    print(out, len(frag))
