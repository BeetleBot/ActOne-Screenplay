import { describe, it, expect } from "vitest";
import { parseFadeInXmlToFountain, parseFadeInToFountain } from "./fadeinParser";
import { parseFdxToFountain, parseScriptFileToFountain } from "./text";
import { zipSync, strToU8 } from "fflate";

describe("Fade In Parser", () => {
  it("parses Fade In XML into Fountain format with forced syntax and formatting", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fadein>
  <styles>
    <style name="Normal Text" font="Courier Prime" size="12"/>
    <style name="Scene Heading" basestyle="Normal Text"/>
    <style name="Action" basestyle="Normal Text"/>
    <style name="Character" basestyle="Normal Text"/>
    <style name="Parenthetical" basestyle="Normal Text"/>
    <style name="Dialogue" basestyle="Normal Text"/>
    <style name="Transition" basestyle="Normal Text"/>
    <style name="Shot" basestyle="Normal Text"/>
  </styles>
  <paras>
    <para number="1">
      <style basestyle="Scene Heading"/>
      <text>INT. COFFEE SHOP - DAY</text>
    </para>
    <para>
      <style basestyle="Action"/>
      <text>John enters. He looks </text>
      <text bold="1">nervous</text>
      <text>.</text>
    </para>
    <para>
      <style basestyle="Character"/>
      <text>JOHN</text>
    </para>
    <para>
      <style basestyle="Parenthetical"/>
      <text>whispering</text>
    </para>
    <para>
      <style basestyle="Dialogue"/>
      <text>Is this seat </text>
      <text italic="1">taken</text>
      <text>?</text>
    </para>
    <para dualdialogue="1">
      <style basestyle="Character"/>
      <text>MARY</text>
    </para>
    <para>
      <style basestyle="Dialogue"/>
      <text>No, sit down.</text>
    </para>
    <para>
      <style basestyle="Transition"/>
      <text>SMASH CUT TO:</text>
    </para>
    <para>
      <style basestyle="Shot"/>
      <text>ANGLE ON DOOR</text>
    </para>
  </paras>
</fadein>`;

    const fountain = parseFadeInXmlToFountain(xml);
    expect(fountain).toContain(".INT. COFFEE SHOP - DAY #1#");
    expect(fountain).toContain("!John enters. He looks **nervous**.");
    expect(fountain).toContain("@JOHN");
    expect(fountain).toContain("(whispering)");
    expect(fountain).toContain("Is this seat *taken*?");
    expect(fountain).toContain("@MARY ^");
    expect(fountain).toContain("> SMASH CUT TO:");
    expect(fountain).toContain("!! ANGLE ON DOOR");
  });

  it("unzips and parses binary .fadein files", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fadein>
  <paras>
    <para>
      <style basestyle="Scene Heading"/>
      <text>EXT. PARK - NIGHT</text>
    </para>
    <para>
      <style basestyle="Action"/>
      <text>A cool breeze blows.</text>
    </para>
  </paras>
</fadein>`;

    const zip = zipSync({
      "document.xml": strToU8(xml),
    });

    const fountain = parseFadeInToFountain(zip);
    expect(fountain).toContain(".EXT. PARK - NIGHT");
    expect(fountain).toContain("!A cool breeze blows.");
  });

  it("handles unified parseScriptFileToFountain correctly with forced syntax", () => {
    const fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>INT. OFFICE - DAY</Text>
    </Paragraph>
    <Paragraph Type="Action">
      <Text Adornmentstyle="1">Important notice:</Text>
      <Text> System update.</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>ALICE</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>Let's begin.</Text>
    </Paragraph>
    <Paragraph Type="Transition">
      <Text>FADE OUT.</Text>
    </Paragraph>
  </Content>
</FinalDraft>`;

    const fdxResult = parseScriptFileToFountain("script.fdx", fdx);
    expect(fdxResult).toContain(".INT. OFFICE - DAY");
    expect(fdxResult).toContain("!**Important notice:** System update.");
    expect(fdxResult).toContain("@ALICE");
    expect(fdxResult).toContain("Let's begin.");
    expect(fdxResult).toContain("> FADE OUT.");

    const fountainPlain = ".INT. ROOM - DAY\n\n!A clock ticks.";
    const fountainResult = parseScriptFileToFountain("script.fountain", fountainPlain);
    expect(fountainResult).toBe(fountainPlain);
  });
});
