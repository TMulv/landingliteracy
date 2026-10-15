"""Render the printable resources in src/resources to PDFs and page-one thumbnails.

Run from the repo root:  python3 scripts/build_pdfs.py
Needs Playwright (Chromium), qpdf and pdftoppm.
"""
import pathlib
import subprocess

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "resources"
OUT = ROOT / "resources"
THUMBS = ROOT / "assets" / "img" / "resources"

FOOTER = (
    '<div style="width:100%;margin:0 0.6in;padding-top:5px;border-top:0.6px solid #e4e8ee;'
    'display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#5b6270;">'
    '<span style="color:#1a1c20;font-weight:600;">landingliteracy.com</span>'
    '<span>Free to copy for classroom and district use. &copy; 2026 Landing Literacy, LLC</span></div>'
)

DOCS = [
    ("walkthrough", "k3-literacy-walkthrough"),
    ("data-chat", "reading-data-chat-protocol"),
    ("sounds-of-english", "sounds-of-english"),
    ("syllable-types", "six-syllable-types"),
    ("spelling-patterns", "spelling-patterns-worth-teaching"),
]


def main() -> None:
    OUT.mkdir(exist_ok=True)
    THUMBS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for src, slug in DOCS + [("pack-cover", "_cover")]:
            page.goto((SRC / f"{src}.html").as_uri())
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(250)
            page.pdf(path=str(OUT / f"{slug}.pdf"), format="Letter", prefer_css_page_size=True, print_background=True,
                     display_header_footer=True, header_template="<div></div>", footer_template=FOOTER)
            print("pdf", slug)
        browser.close()

    pack = OUT / "landing-literacy-starter-pack.pdf"
    parts = [str(OUT / "_cover.pdf")] + [str(OUT / f"{slug}.pdf") for _, slug in DOCS]
    subprocess.run(["qpdf", "--empty", "--pages", *parts, "--", str(pack)], check=True)
    (OUT / "_cover.pdf").unlink()
    print("pack", pack.name)

    for _, slug in DOCS:
        stem = THUMBS / slug
        subprocess.run(["pdftoppm", "-png", "-f", "1", "-l", "1", "-scale-to", "720", "-singlefile", str(OUT / f"{slug}.pdf"), str(stem)], check=True)
        print("thumb", slug)


if __name__ == "__main__":
    main()
