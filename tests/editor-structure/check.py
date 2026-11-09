"""Real Chromium layout checks for screenplay structure. No mocked measurements.

Requires Edge and msedgedriver (EDGE_DRIVER may specify its path).
Run: npm run test:editor-structure
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]

def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]

def wait(fn, seconds=30):
    deadline = time.monotonic() + seconds
    last = None
    while time.monotonic() < deadline:
        try:
            result = fn()
            if result:
                return result
        except (OSError, ValueError) as error:
            last = error
        time.sleep(0.1)
    raise TimeoutError(f'Test timed out: {last}')

def main():
    vite_port, driver_port = port(), port()
    flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
    driver_path = os.environ.get('EDGE_DRIVER', str(ROOT / 'node_modules/.desktop-tools/bin/msedgedriver.exe'))
    base = f'http://127.0.0.1:{driver_port}'
    def request(method, route, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(base + route, data=data, method=method, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.load(response)
        value = result.get('value', result)
        if isinstance(value, dict) and value.get('error') and 'message' in value:
            raise RuntimeError(value)
        return value
    session = None
    processes = []
    logs = ROOT / 'node_modules/.structure-results'
    logs.mkdir(parents=True, exist_ok=True)
    with (logs / 'server.log').open('w') as log:
        try:
            processes.append(subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', str(vite_port), '--strictPort'], cwd=ROOT, stdout=log, stderr=log, **flags))
            processes.append(subprocess.Popen([driver_path, f'--port={driver_port}'], stdout=log, stderr=log, **flags))
            wait(lambda: request('GET', '/status'))
            wait(lambda: urllib.request.urlopen(f'http://127.0.0.1:{vite_port}/tests/editor-structure/').status == 200)
            session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'MicrosoftEdge', 'ms:edgeOptions': {'args': ['--headless=new', '--disable-gpu', '--window-size=1500,1000']}}}})['sessionId']
            route = f'/session/{session}'
            request('POST', route + '/url', {'url': f'http://127.0.0.1:{vite_port}/tests/editor-structure/'})
            result = wait(lambda: request('POST', route + '/execute/sync', {'script': 'return window.structureResults?.done ? window.structureResults : null', 'args': []}), 45)
            (logs / 'results.json').write_text(json.dumps(result, indent=2))
            if result.get('error'):
                screenshot = request('GET', route + '/screenshot')
                import base64
                (logs / 'failure.png').write_bytes(base64.b64decode(screenshot))
                raise AssertionError(result['error'])
            for passed in result['passed']:
                print('PASS:', passed)
        finally:
            if session:
                try:
                    request('DELETE', f'/session/{session}')
                except OSError:
                    pass
            for process in reversed(processes):
                process.terminate()
                process.wait(timeout=10)

if __name__ == '__main__':
    main()
