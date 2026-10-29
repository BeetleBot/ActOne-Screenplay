"""Validate the four required root entries in the AppImage AppDir specification."""

import configparser
import os
from pathlib import Path
import struct
import sys


def validate(root: Path) -> None:
    def contained_file(path: Path) -> bool:
        return path.is_file() and path.resolve().is_relative_to(root.resolve())

    launcher = root / "AppRun"
    if not contained_file(launcher) or not os.access(launcher, os.X_OK):
        raise ValueError("AppRun must be an executable file inside the AppDir")

    thumbnail = root / ".DirIcon"
    if not contained_file(thumbnail):
        raise ValueError(".DirIcon is missing or links outside the AppDir")
    with thumbnail.open("rb") as stream:
        header = stream.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(".DirIcon must be a PNG image")
    width, height = struct.unpack(">II", header[16:24])
    if width == 0 or width != height:
        raise ValueError(".DirIcon must have nonzero square dimensions")

    desktops = list(root.glob("*.desktop"))
    if len(desktops) != 1 or not contained_file(desktops[0]):
        raise ValueError("Exactly one desktop file must exist at the AppDir root")
    desktop = configparser.ConfigParser(interpolation=None, strict=False)
    desktop.read(desktops[0], encoding="utf8")
    entry = desktop["Desktop Entry"]
    if entry.get("Type") != "Application" or not entry.get("Name") or not entry.get("Exec"):
        raise ValueError("Desktop entry requires Type=Application, Name and Exec")
    icon = entry.get("Icon", "")
    if not icon or Path(icon).name != icon or Path(icon).suffix:
        raise ValueError("Desktop Icon must be a root icon name without an extension")
    if not any(contained_file(root / f"{icon}.{ext}") for ext in ("png", "svg", "xpm")):
        raise ValueError(f"Desktop Icon={icon} has no matching icon inside the AppDir root")


if __name__ == "__main__":
    try:
        validate(Path(sys.argv[1]))
    except (ValueError, KeyError, OSError, configparser.Error) as error:
        sys.exit(f"Invalid AppDir: {error}")
    print("AppDir required root files and portable icon links passed.")
