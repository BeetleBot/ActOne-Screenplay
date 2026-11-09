"""Bundle static prose PDF faces from Google Fonts (requires fonttools).

Run from the repository root. Original OFL licenses accompany every family.
Static faces avoid relying on variable-font support in PDF consumers.
"""
import io
import json
from pathlib import Path
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/fonts/prose"
FAMILIES = {
    "literata": "Literata",
    "sourceserif4": "Source Serif 4",
    "inter": "Inter",
    "ebgaramond": "EB Garamond",
}


def download(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for directory, family in FAMILIES.items():
        entries = json.loads(download(f"https://api.github.com/repos/google/fonts/contents/ofl/{directory}"))
        (DEST / f"{directory}-OFL.txt").write_bytes(download(next(e["download_url"] for e in entries if e["name"] == "OFL.txt")))
        for entry in entries:
            if not entry["name"].endswith(".ttf"):
                continue
            source = download(entry["download_url"])
            italic = "Italic" in entry["name"]
            for weight in (400, 700):
                font = TTFont(io.BytesIO(source))
                axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
                axes["wght"] = weight
                if "opsz" in axes:
                    axes["opsz"] = 12
                font = instantiateVariableFont(font, axes, inplace=True)
                style = ("Bold" if weight == 700 else "") + ("Italic" if italic else "") or "Regular"
                subfamily = {"BoldItalic": "Bold Italic"}.get(style, style)
                for name_id, value in {1: family, 2: subfamily, 3: f"{family}-{style}", 4: f"{family} {subfamily}", 6: f"{family.replace(' ', '')}-{style}", 16: family, 17: subfamily}.items():
                    font["name"].setName(value, name_id, 3, 1, 0x409)
                font.save(DEST / f"{directory}-{style}.ttf")
        print(f"Bundled {family}", flush=True)


if __name__ == "__main__":
    main()
