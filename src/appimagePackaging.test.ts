import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("AppImage tool release pin", () => {
  it("uses a versioned release and its verified SHA-256 instead of a rolling download", () => {
    const script = readFileSync("Release/appimage/repack-appimage.sh", "utf8");
    expect(script).toContain("releases/download/1.9.1/appimagetool-x86_64.AppImage");
    expect(script).toContain("ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0");
    expect(script).not.toContain("releases/download/continuous/");
  });
});

describe.skipIf(process.platform !== "linux")("AppImage packaging checks", () => {
  let directory: string;
  let fixture: string;
  let image: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "actone-appimage-test-"));
    fixture = join(directory, "fixture");
    mkdirSync(join(fixture, "usr/lib/webkit2gtk-4.1/injected-bundle"), { recursive: true });
    writeFileSync(join(fixture, "AppRun"), "#!/bin/bash\nexit 0\n");
    chmodSync(join(fixture, "AppRun"), 0o755);
    copyFileSync("src-tauri/icons/128x128@2x.png", join(fixture, ".DirIcon"));
    copyFileSync("src-tauri/icons/128x128@2x.png", join(fixture, "actone.png"));
    writeFileSync(join(fixture, "actone.desktop"), "[Desktop Entry]\nType=Application\nName=ActOne Screenplay\nExec=actone %f\nIcon=actone\n");
    image = join(directory, "fixture.AppImage");
    writeFileSync(image, '#!/bin/bash\nset -eu\n[ "$1" = --appimage-extract ]\ncp -a "$APPIMAGE_TEST_FIXTURE" squashfs-root\n');
    chmodSync(image, 0o755);
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  const verify = (imagePath: string, fixturePath: string) => spawnSync("bash", [
    resolve("Release/appimage/verify-appimage.sh"), imagePath,
  ], {
    encoding: "utf8",
    env: { ...process.env, APPIMAGE_TEST_FIXTURE: fixturePath, APPIMAGE_SMOKE_TEST: "0" },
  });

  it("rejects the original failure: shared libraries without helper processes", () => {
    const result = verify(image, fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing required WebKit component: WebKitNetworkProcess");
  });

  it("requires the web process and injected bundle as well as the network process", () => {
    copyFileSync("/usr/bin/true", join(fixture, "usr/lib/webkit2gtk-4.1/WebKitNetworkProcess"));
    const result = verify(image, fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing required WebKit component: WebKitWebProcess");
  });

  it("accepts all required components with resolvable ELF dependencies", () => {
    for (const component of ["WebKitNetworkProcess", "WebKitWebProcess", "injected-bundle/libwebkit2gtkinjectedbundle.so"]) {
      copyFileSync("/usr/bin/true", join(fixture, "usr/lib/webkit2gtk-4.1", component));
    }
    const result = verify(image, fixture);
    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects the published artifact's broken build-machine .DirIcon link", () => {
    rmSync(join(fixture, ".DirIcon"));
    symlinkSync("/home/runner/work/ActOne/ActOne.AppDir/actone.png", join(fixture, ".DirIcon"));
    const result = verify(image, fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".DirIcon is missing or links outside");
  });

  it("rejects absolute icon links even when they resolve on the build host", () => {
    rmSync(join(fixture, ".DirIcon"));
    symlinkSync(resolve("src-tauri/icons/128x128@2x.png"), join(fixture, ".DirIcon"));
    expect(verify(image, fixture).stderr).toContain(".DirIcon is missing or links outside");
  });

  it("requires exactly one root desktop file", () => {
    writeFileSync(join(fixture, "extra.desktop"), "[Desktop Entry]\n");
    expect(verify(image, fixture).stderr).toContain("Exactly one desktop file");
  });

  it("requires the root icon to match the desktop Icon entry", () => {
    rmSync(join(fixture, "actone.png"));
    expect(verify(image, fixture).stderr).toContain("Icon=actone has no matching icon");
  });

  it("repacks with a regular PNG instead of the original absolute symlink", () => {
    rmSync(join(fixture, ".DirIcon"));
    symlinkSync("/home/runner/missing.png", join(fixture, ".DirIcon"));
    const tool = join(directory, "appimagetool");
    writeFileSync(tool, '#!/bin/bash\nset -eu\ntest -f "$1/.DirIcon"\ntest ! -L "$1/.DirIcon"\ncp "$1/.DirIcon" "$2"\n');
    chmodSync(tool, 0o755);
    const result = spawnSync("bash", [resolve("Release/appimage/repack-appimage.sh"), image, join(directory, "output.AppImage")], {
      encoding: "utf8",
      env: { ...process.env, APPIMAGETOOL: tool, APPIMAGE_TEST_FIXTURE: fixture },
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("fails the startup test when the app exits without a window", () => {
    writeFileSync(join(fixture, "AppRun"), "#!/bin/bash\necho 'WebKit startup failed' >&2\nexit 1\n");
    chmodSync(join(fixture, "AppRun"), 0o755);
    const result = spawnSync("bash", [resolve("Release/appimage/smoke-appimage.sh"), fixture], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WebKit startup failed");
  });

  it("rejects a downloaded tool with a mismatched checksum before executing it", () => {
    const bin = join(directory, "bin");
    mkdirSync(bin);
    const curl = join(bin, "curl");
    // Return a runnable but untrusted download. It must never reach execution.
    writeFileSync(curl, '#!/bin/bash\nset -eu\nwhile [ "$1" != --output ]; do shift; done\nshift\nprintf \'#!/bin/bash\\ntouch "$APPIMAGE_TOOL_EXECUTED"\\n\' > "$1"\n');
    chmodSync(curl, 0o755);
    const marker = join(directory, "executed");
    const result = spawnSync("bash", [resolve("Release/appimage/repack-appimage.sh"), image, join(directory, "output.AppImage")], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, APPIMAGETOOL: "", APPIMAGE_TEST_FIXTURE: fixture, APPIMAGE_TOOL_EXECUTED: marker },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("checksum did NOT match");
    expect(() => readFileSync(marker)).toThrow();
  });

  it("keeps the packaging shell scripts syntactically valid", () => {
    for (const script of ["build-appimage.sh", "package-appimage.sh", "verify-appimage.sh", "smoke-appimage.sh", "repack-appimage.sh"]) {
      expect(() => execFileSync("bash", ["-n", resolve("Release/appimage", script)])).not.toThrow();
    }
  });
});
