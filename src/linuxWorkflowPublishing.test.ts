import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const release = readFileSync(".github/workflows/build-linux.yml", "utf8");
const testBuild = readFileSync(".github/workflows/test-linux.yml", "utf8");

describe("separate Linux release and test workflows", () => {
  it("starts release publishing only for version tag pushes", () => {
    const triggers = release.split("permissions:")[0];
    expect(triggers).toContain("push:");
    expect(triggers).toContain("tags:");
    expect(triggers).toContain("- 'v*'");
    expect(triggers).not.toContain("workflow_dispatch");
    expect(release).toContain('VERSION="${GITHUB_REF_NAME#v}"');
    expect(release).toContain("gh release upload");
    expect(release).toContain("publish-flatpak-repository:");
    expect(release).not.toContain("inputs.format");
    expect(release).not.toContain("inputs.publish");
  });
  it("starts test builds manually on branches, using the pushed commit and package version", () => {
    const triggers = testBuild.split("permissions:")[0];
    expect(triggers).toContain("workflow_dispatch:");
    expect(triggers).not.toContain("push:");
    expect(triggers).not.toContain("tags:");
    expect(testBuild).toContain("if: github.ref_type == 'branch'");
    expect(testBuild).toContain("require('./package.json').version");
    expect(testBuild).not.toContain("GITHUB_REF_NAME#v");
    const checkouts = testBuild.split("uses: actions/checkout@v4").slice(1);
    expect(checkouts).toHaveLength(3);
    for (const checkout of checkouts) expect(checkout.split("      - name:")[0]).toContain("ref: ${{ github.sha }}");
  });
  it("gives manual builds no release, signing, secret, or publication capabilities", () => {
    expect(testBuild).toContain("contents: read");
    for (const forbidden of [
      "contents: write",
      "gh release",
      "publish-flatpak-repository:",
      "aws s3",
      "secrets.",
      "sign-flatpak-repository.sh",
      "inputs.publish",
    ]) {
      expect(testBuild).not.toContain(forbidden);
    }
  });
  it("preserves compilation, packaging and downloadable artifacts in both workflows", () => {
    for (const workflow of [release, testBuild]) {
      expect(workflow).toContain("npm run tauri build -- --no-bundle");
      expect(workflow).toContain("bash Release/appimage/package-appimage.sh");
      expect(workflow).toContain("flatpak/flatpak-github-actions/flatpak-builder@v6");
      for (const format of ["AppImage", "Flatpak"]) {
        const step = workflow
          .split(`      - name: Upload ${format} artifact (Downloadable)`)[1]
          .split(/\r?\n(?: {6}- name:| {2}[a-z][a-z-]+:)/)[0];
        expect(step).toContain("actions/upload-artifact@v4");
        expect(step).toContain("retention-days: 30");
        expect(step).not.toContain("if:");
      }
    }
    expect(testBuild).toContain("if: inputs.format == 'both' || inputs.format == 'appimage'");
    expect(testBuild).toContain("if: inputs.format == 'both' || inputs.format == 'flatpak'");
  });
});
