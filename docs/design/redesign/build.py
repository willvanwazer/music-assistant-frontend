#!/usr/bin/env python3
"""Bundle the Liner Notes prototype into one self-contained HTML file.

Usage:  python3 docs/design/redesign/build.py
Output: docs/design/roon-redesign.html  (open it directly in a browser)
"""
from pathlib import Path

here = Path(__file__).resolve().parent
html = (here / "index.html").read_text()

css = (here / "styles.css").read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")

for name in ("data.js", "app.js"):
    js = (here / name).read_text()
    if "</script" in js:
        raise SystemExit(f"{name} contains a closing script tag; cannot inline safely")
    html = html.replace(f'<script src="{name}"></script>', f"<script>\n{js}\n</script>")

out = here.parent / "roon-redesign.html"
out.write_text(html)
print(f"wrote {out} ({len(html) // 1024} KB)")
