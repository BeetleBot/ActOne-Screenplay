import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/build-linux.yml", "utf8");

function jobDefinition(name: string): string {
  const section = workflow.split(`\n  ${name}:`)[1];
  if (!section) throw new Error(`Missing workflow job: ${name}`);
  return section.split(/\n {2}[a-z][a-z-]*:/)[0];
}

function selectsFormat(job: string, event: string, format?: string): boolean {
  const condition = jobDefinition(job).match(/\n {4}if: (.+)/)?.[1];
  if (!condition) throw new Error(`Missing format condition: ${job}`);
  // Interpret only the equality/OR clauses used by these job conditions.
  return condition.split(" || ").some((clause) => {
    const match = clause.match(/^(github.event_name|inputs.format) (==|!=) '([^']+)'$/);
    if (!match) throw new Error(`Unsupported workflow condition: ${clause}`);
    const actual = match[1] === "github.event_name" ? event : format;
    return match[2] === "==" ? actual === match[3] : actual !== match[3];
  });
}

describe("unified Linux workflow", () => {
  it.each([
    ["push", undefined, true, true],
    ["workflow_dispatch", "both", true, true],
    ["workflow_dispatch", "appimage", true, false],
    ["workflow_dispatch", "flatpak", false, true],
  ])("selects packages for %s / %s", (event, format, appimage, flatpak) => {
    expect(selectsFormat("package-appimage", event, format)).toBe(appimage);
    expect(selectsFormat("package-flatpak", event, format)).toBe(flatpak);
  });

  it("offers all manual choices and defaults to both", () => {
    expect(workflow).toMatch(/type: choice\s+default: both\s+options:\s+- both\s+- appimage\s+- flatpak/);
  });

  it("publishes the Flatpak repository only after successful Flatpak packaging", () => {
    const publisher = jobDefinition("publish-flatpak-repository");
    expect(publisher).toContain("needs: [build-bundle, package-flatpak]");
    expect(publisher).not.toMatch(/\n {4}if:/);
  });

  it("replaces the standalone Linux workflows", () => {
    expect(existsSync(".github/workflows/build-appimage.yml")).toBe(false);
    expect(existsSync(".github/workflows/build-flatpak.yml")).toBe(false);
  });
});
