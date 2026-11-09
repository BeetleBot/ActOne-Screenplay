import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = readFileSync(".github/workflows/build-linux.yml", "utf8");
const publishingCondition = "github.event_name == 'push' || inputs.publish == true";

describe("Linux artifact-only builds", () => {
  it("defaults manual runs to no publishing", () => {
    const input = workflow.split("      publish:")[1].split("      version:")[0];
    expect(input).toContain("type: boolean");
    expect(input).toContain("default: false");
  });
  it("guards every GitHub Release modification with explicit publishing authorization", () => {
    const steps = workflow.split(/\r?\n      - name: /).slice(1);
    const releaseSteps = steps.filter(step => step.includes("gh release "));
    expect(releaseSteps).toHaveLength(2);
    for (const step of releaseSteps) expect(step).toContain(`        if: ${publishingCondition}`);
  });
  it("skips signing and updating the public Flatpak repository in artifact-only runs", () => {
    const job = workflow.split("  publish-flatpak-repository:")[1];
    expect(job).toContain(`    if: ${publishingCondition}`);
  });
  it("keeps AppImage and Flatpak workflow artifacts available without publishing", () => {
    for (const format of ["AppImage", "Flatpak"]) {
      const step = workflow.split(`      - name: Upload ${format} artifact (Downloadable)`)[1].split("      - name:")[0];
      expect(step).toContain("actions/upload-artifact@v4");
      expect(step).toContain("retention-days: 30");
      expect(step).not.toContain("if:");
    }
  });
});
