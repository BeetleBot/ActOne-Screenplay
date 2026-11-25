"""Native benchmark using the isolated desktop-test application only.

Requires psutil and the same WebDriver tools as workflow.py. Times include
WebDriver overhead; they must not be described as raw keystroke latency.
Run identical baseline/current binaries on the same host, with no other builds.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import tempfile
import time

import psutil
import workflow


def resources(driver):
    """Aggregate app and descendant RSS/CPU; shared pages may be counted twice."""
    roots = []
    for process in psutil.Process(driver.pid).children(recursive=True):
        try:
            if Path(process.exe()).resolve() == workflow.APPLICATION.resolve():
                roots.append(process)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    processes = {p.pid: p for root in roots for p in [root, *root.children(recursive=True)]}
    cpu, rss = 0.0, 0
    for process in processes.values():
        try:
            times = process.cpu_times()
            cpu += times.user + times.system
            rss += process.memory_info().rss
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return {"cpuSeconds": cpu, "aggregateRssBytes": rss, "processes": len(processes)}


def frame(session):
    session.call("POST", "/execute/async", {
        "script": "const done=arguments[arguments.length-1]; requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));",
        "args": [],
    })


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True)
    parser.add_argument("--application", type=Path, default=workflow.APPLICATION)
    parser.add_argument("--fixture", type=Path, default=workflow.ROOT / "Test-Files/BeeDetective.fountain")
    parser.add_argument("--skip-xray", action="store_true", help="Use for prose or other non-screenplay fixtures")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", args.phase) or args.runs < 1:
        parser.error("Use a lowercase phase name and a positive run count")
    workflow.APPLICATION = args.application.resolve()
    if not workflow.APPLICATION.is_file():
        raise RuntimeError("Build the isolated app first: npm run build:desktop-test")
    command = [str(workflow.TOOLS / ("tauri-driver" + workflow.SUFFIX))]
    if os.name == "nt":
        command += ["--native-driver", str(workflow.TOOLS / "msedgedriver.exe")]
    report = {"phase": args.phase, "application": str(workflow.APPLICATION),
              "scope": "Native command-to-frame timings include WebDriver overhead; RSS sums shared pages. No thresholds inferred from one run.",
              "measurements": []}
    output = workflow.ROOT / "output/benchmarks"
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="actone-benchmark-") as directory:
        workspace = Path(directory).resolve()
        if not workspace.is_relative_to(Path(tempfile.gettempdir()).resolve()):
            raise RuntimeError("Unexpected temporary workspace")
        fixture = workspace / args.fixture.name
        shutil.copyfile(args.fixture, fixture)
        report["fixture"] = args.fixture.name
        with (output / f"native-{args.phase}-driver.log").open("w", encoding="utf8") as log:
            driver = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            try:
                workflow.wait(lambda: workflow.request("GET", "/status"), "desktop driver startup")
                for _ in range(args.runs):
                    session = workflow.Session()
                    try:
                        start = time.perf_counter()
                        editor = session.open(fixture)  # Checks isolated app ID before touching storage.
                        frame(session)
                        open_ms = (time.perf_counter() - start) * 1000
                        idle_before = resources(driver)
                        time.sleep(1)
                        idle_after = resources(driver)
                        if not idle_after["processes"]:
                            raise RuntimeError("Cannot locate the isolated application process for resource measurements")
                        session.keys(editor, "\ue009\ue010\ue000")
                        samples = []
                        for _ in range(12):
                            start = time.perf_counter()
                            session.keys(editor, " bee")
                            frame(session)
                            samples.append((time.perf_counter() - start) * 1000)
                        xray_ms = None
                        if not args.skip_xray:
                            handles = session.call("GET", "/window/handles")
                            original = session.call("GET", "/window")
                            start = time.perf_counter()
                            session.script("window.dispatchEvent(new Event('actone:open-xray'))")
                            handle = workflow.wait(lambda: next((h for h in session.call("GET", "/window/handles") if h not in handles), None), "X-Ray window")
                            session.call("POST", "/window", {"handle": handle})
                            workflow.wait(lambda: session.script("return !!document.querySelector('[aria-label^=\"Scene rhythm:\"]')"), "X-Ray report")
                            frame(session)
                            xray_ms = (time.perf_counter() - start) * 1000
                            session.call("DELETE", "/window")
                            session.call("POST", "/window", {"handle": original})
                        report["measurements"].append({
                            "documentOpenToFrameMs": open_ms,
                            "editCommandToFrameMedianMs": statistics.median(samples),
                            "editCommandToFrameMaxMs": max(samples),
                            "xrayCommandToReportFrameMs": xray_ms,
                            "idleCpuSecondsPerOneSecond": max(0, idle_after["cpuSeconds"] - idle_before["cpuSeconds"]),
                            "resourcesAfterIdle": idle_after, "resourcesAfterXrayClosed": resources(driver),
                        })
                    finally:
                        session.close()
            finally:
                driver.terminate()
                try:
                    driver.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    driver.kill()
                    driver.wait()
                (output / f"native-{args.phase}.json").write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
