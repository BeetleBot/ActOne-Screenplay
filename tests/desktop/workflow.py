"""Real native WebView test. No mocked IPC, editor, serialization, or filesystem."""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "node_modules/.desktop-results"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
SUFFIX = ".exe" if sys.platform == "win32" else ""
APPLICATION = ROOT / f"node_modules/.desktop-app/actone{SUFFIX}"
TOOLS = ROOT / "node_modules/.desktop-tools/bin"
ELEMENT = "element-6066-11e4-a52e-4f735466cecf"
URL = "http://127.0.0.1:4444"

def request(method, route, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(URL + route, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error
    return result.get("value", result)

def wait(check, message, seconds=30):
    deadline = time.monotonic() + seconds
    last = None
    while time.monotonic() < deadline:
        try:
            value = check()
            if value:
                return value
        except (RuntimeError, OSError, zipfile.BadZipFile) as error:
            last = error
        time.sleep(0.1)
    raise AssertionError(f"Timed out: {message}; last error: {last}")

class Session:
    def __init__(self):
        result = request("POST", "/session", {"capabilities": {"alwaysMatch": {
            "browserName": "wry", "tauri:options": {"application": str(APPLICATION)}
        }}})
        self.id = result["sessionId"]
    def call(self, method, route, body=None):
        return request(method, f"/session/{self.id}{route}", body)
    def script(self, script, *args):
        return self.call("POST", "/execute/sync", {"script": script, "args": list(args)})
    def element(self, selector):
        return self.call("POST", "/element", {"using": "css selector", "value": selector})[ELEMENT]
    def keys(self, element, text):
        self.call("POST", f"/element/{element}/value", {"text": text, "value": list(text)})
    def open(self, path):
        wait(lambda: self.script("return !!document.querySelector('#root') && !!window.__TAURI_INTERNALS__"), "native app startup")
        identity = self.call("POST", "/execute/async", {"script": "const done = arguments[arguments.length - 1]; window.__TAURI_INTERNALS__.invoke('plugin:app|identifier').then(done, error => done(String(error)));", "args": []})
        assert identity == "ink.iyal.actone.e2e", f"Refusing to edit profile {identity!r}; run npm run build:desktop-test"
        self.script("localStorage.clear(); localStorage.setItem('pending-open-path', arguments[0]);", str(path))
        origin = self.script("return location.origin")
        self.call("POST", "/url", {"url": origin + "/?action=open"})
        return wait(lambda: self.element(".cm-content[contenteditable=true]"), "project editor")
    def close(self):
        try:
            self.call("POST", f"/element/{self.element('button[title=Close]')}/click", {})
        except RuntimeError:
            pass  # A closed window may terminate the session before the response returns.
        finally:
            try:
                self.call("DELETE", "")
            except RuntimeError:
                pass

def main():
    if not APPLICATION.exists():
        raise RuntimeError("Build the isolated test app first: npm run build:desktop-test")
    command = [str(TOOLS / f"tauri-driver{SUFFIX}")]
    if sys.platform == "win32":
        command += ["--native-driver", str(TOOLS / "msedgedriver.exe")]
    env = dict(os.environ)
    # Protect development app storage even if the wrong binary was built.
    with tempfile.TemporaryDirectory(prefix="actone-desktop-") as directory, (ARTIFACTS / "driver.log").open("w", encoding="utf-8") as log:
        fixture = Path(directory) / "Desktop lifecycle.actOne"
        shutil.copyfile(ROOT / "qa-test-fixtures/Complete_Feature_Project.actone", fixture)
        with zipfile.ZipFile(fixture) as archive:
            original_entries = set(archive.namelist())
        driver = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=env, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
        session = None
        try:
            wait(lambda: request("GET", "/status"), "desktop driver startup")
            session = Session()
            editor = session.open(fixture)
            marker = "Native desktop save and restart verified."
            text = "INT. TEST ROOM - DAY\n\n" + marker + "\n\nEXT. STREET - NIGHT\n\nA second scene."
            session.call("POST", f"/element/{editor}/click", {})
            session.keys(editor, "\ue009a\ue000")
            session.keys(editor, text)
            session.keys(editor, "\ue009s\ue000")
            def saved():
                with zipfile.ZipFile(fixture) as archive:
                    return any(marker in archive.read(name).decode("utf-8") for name in archive.namelist() if name.endswith(".fountain"))
            wait(saved, "native save to actual project file")
            session.close()
            session = None
            # A new WebDriver session starts a fresh application process.
            session = Session()
            session.open(fixture)
            wait(lambda: marker in session.script("return document.querySelector('.cm-content')?.textContent || ''"), "saved text after application restart")
            with zipfile.ZipFile(fixture) as archive:
                assert original_entries <= set(archive.namelist()), "Saving lost project entries"
            print("Desktop workflow passed: native open, type, save, close, process restart and reopen.")
        except Exception:
            if session:
                try:
                    (ARTIFACTS / "failure.html").write_text(session.call("GET", "/source"), encoding="utf-8")
                    (ARTIFACTS / "failure.png").write_bytes(base64.b64decode(session.call("GET", "/screenshot")))
                except Exception:
                    pass
            raise
        finally:
            if session:
                session.close()
            driver.terminate()
            try:
                driver.wait(timeout=10)
            except subprocess.TimeoutExpired:
                driver.kill()
                driver.wait()

if __name__ == "__main__":
    main()
