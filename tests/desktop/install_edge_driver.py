"""Install a WebDriver matching the installed WebView2, in the workspace only."""
import io
import os
from pathlib import Path
import urllib.request
import zipfile

root = Path(__file__).resolve().parents[2]
runtime = Path(os.environ["ProgramFiles(x86)"]) / "Microsoft/EdgeWebView/Application"
versions = [p.name for p in runtime.iterdir() if (p / "msedgewebview2.exe").exists()]
version = max(versions, key=lambda s: tuple(map(int, s.split("."))))
target = root / "node_modules/.desktop-tools/bin"
target.mkdir(parents=True, exist_ok=True)
with urllib.request.urlopen(f"https://msedgedriver.microsoft.com/{version}/edgedriver_win64.zip", timeout=60) as response:
    with zipfile.ZipFile(io.BytesIO(response.read())) as archive:
        (target / "msedgedriver.exe").write_bytes(archive.read("msedgedriver.exe"))
print(f"Installed Edge driver {version}")
