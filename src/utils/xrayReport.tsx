import type { ReactNode } from "react";
import { createTheme } from "@mui/material/styles";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ConnectionChart,
  DonutChart,
  PresenceChart,
  RankedBars,
  RhythmChart,
  SceneRowsChart,
  type ChartColors,
} from "../components/XrayCharts";
import { summarizeXrayWorld, type XrayReport } from "./xray";

export interface XrayPrintPage {
  title: string;
  subtitle: string;
  content: ReactNode;
}
const palette = createTheme({ palette: { mode: "light" } }).palette;
export const XRAY_PRINT_COLORS: ChartColors = {
  text: palette.text.primary,
  muted: palette.text.secondary,
  grid: palette.divider,
  surface: palette.background.paper,
  dialogue: palette.info.dark,
  action: palette.success.dark,
  third: palette.warning.dark,
  fourth: palette.secondary.dark,
};
const short = (s: string, length: number) => (s.length > length ? `${s.slice(0, length - 1)}…` : s);
const chunks = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
function Block({
  title,
  x = 48,
  y,
  width = 744,
  children,
}: {
  title: string;
  x?: number;
  y: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text y={0} fontSize={14} fontWeight={600} fill={XRAY_PRINT_COLORS.text}>
        {title}
      </text>
      <svg x={0} y={18} width={width} overflow="visible">
        {children}
      </svg>
    </g>
  );
}
/** Shared charts, paginated independently of all dashboard filters. */
export function buildXrayReport(
  report: XrayReport,
  _title: string,
  dialogueWpm: number,
  actionWpm: number,
): XrayPrintPage[] {
  const colors = XRAY_PRINT_COLORS;
  const world = summarizeXrayWorld(report);
  const pages: XrayPrintPage[] = [
    {
      title: "Your story at a glance",
      subtitle: "Dialogue / blue     Action / green",
      content: (
        <>
          {[
            [report.scenes.length, "SCENES"],
            [report.characters.length, "VOICES"],
            [report.words.toLocaleString(), "BODY WORDS"],
            [`${Math.floor(report.seconds / 60)}:${String(report.seconds % 60).padStart(2, "0")}`, "EST. READING"],
          ].map(([value, label], i) => (
            <g key={label} transform={`translate(${48 + i * 190} 200)`}>
              <rect width={174} height={84} rx={8} fill={colors.dialogue} opacity={0.06} />
              <text
                x={16}
                y={38}
                fontSize={27}
                fontWeight={700}
                fill={i < 2 ? (i === 0 ? colors.dialogue : colors.action) : colors.text}
              >
                {value}
              </text>
              <text x={16} y={62} fontSize={10} letterSpacing={1} fill={colors.muted}>
                {label}
              </text>
            </g>
          ))}
          <Block title="Scene rhythm / words per scene" y={325}>
            <RhythmChart colors={colors} scenes={report.scenes} />
          </Block>
          <Block title="Story balance / word share" y={610} width={340}>
            <DonutChart
              colors={colors}
              label="Body word share"
              center={`${Math.round((report.dialogueWords / (report.words || 1)) * 100)}%`}
              data={[
                { label: "Dialogue", value: report.dialogueWords },
                { label: "Action", value: report.actionWords },
              ]}
            />
          </Block>
          <Block title="Leading voices / words & share" x={440} y={610} width={350}>
            <RankedBars
              colors={colors}
              width={350}
              data={report.characters.slice(0, 5).map((c) => ({ label: c.name, value: c.words }))}
              total={report.dialogueWords}
            />
          </Block>
          <Block title="Speaking presence / first 40 scenes, leading 5 voices" y={885}>
            <PresenceChart
              colors={colors}
              characters={report.characters.slice(0, 5)}
              scenes={report.scenes.slice(0, 40)}
            />
          </Block>
        </>
      ),
    },
  ];
  for (const scenes of chunks(report.scenes, 14))
    pages.push({
      title: `Scene journey / ${scenes[0].number}–${scenes.at(-1)!.number}`,
      subtitle: "Blue = dialogue · Green = action · Read = estimated minutes:seconds",
      content: (
        <>
          <Block title="Rhythm" y={215}>
            <RhythmChart scenes={scenes} colors={colors} />
          </Block>
          <Block title="Scene breakdown" y={485}>
            <SceneRowsChart scenes={scenes} colors={colors} />
          </Block>
        </>
      ),
    });
  for (const cast of chunks(report.characters, 8))
    pages.push({
      title: "Character voices",
      subtitle: "Dialogue words / share of all dialogue",
      content: (
        <>
          <Block title="Dialogue distribution" y={215}>
            <RankedBars
              colors={colors}
              width={700}
              total={report.dialogueWords}
              data={cast.map((c) => ({ label: c.name, value: c.words }))}
            />
          </Block>
          <Block title="Speaking scenes per character" y={640}>
            <RankedBars
              colors={colors}
              width={700}
              unit="scenes"
              data={cast.map((c) => ({ label: c.name, value: c.scenes.length }))}
            />
          </Block>
        </>
      ),
    });
  for (const cast of chunks(report.characters, 12))
    for (const scenes of chunks(report.scenes, 30))
      pages.push({
        title: "Cast across the story",
        subtitle: `Scenes ${scenes[0].number}–${scenes.at(-1)!.number} · brighter cells = more dialogue`,
        content: (
          <>
            <Block title="Speaking presence" y={220}>
              <PresenceChart characters={cast} scenes={scenes} colors={colors} />
            </Block>
            <Block title="Shared-scene matrix / this cast group" y={680}>
              <ConnectionChart report={report} characters={cast} colors={colors} width={900} />
            </Block>
          </>
        ),
      });
  for (const locations of chunks(world.locations, 17))
    pages.push({
      title: "The world of your story",
      subtitle: "Scene-heading breakdown",
      content: (
        <>
          <Block title="Inside / outside" y={210} width={345}>
            <DonutChart colors={colors} label="Settings" data={world.settings} />
          </Block>
          <Block title="Day / night" x={442} y={210} width={345}>
            <DonutChart colors={colors} label="Time of day" data={world.times} />
          </Block>
          <Block title="Locations / number of scenes" y={460}>
            <RankedBars colors={colors} width={700} data={locations} unit="scenes" />
          </Block>
        </>
      ),
    });
  for (const pairs of chunks(report.connections, 22))
    pages.push({
      title: "Shared-scene connections",
      subtitle: "Co-occurrence of speaking cues · shared scene count",
      content: (
        <Block title="Character pairs" y={220}>
          <RankedBars
            colors={colors}
            width={700}
            data={pairs.map((c) => ({ label: c.names.join(" + "), value: c.scenes.length }))}
            unit="shared scenes"
          />
        </Block>
      ),
    });
  pages.push({
    title: "Reading the atlas",
    subtitle: "Measurement key",
    content: (
      <>
        {[
          "SCENE RHYTHM",
          "CHARACTER VOICES",
          "SPEAKING PRESENCE",
          "SHARED SCENES",
          "READING ESTIMATE",
          "BODY WORDS",
        ].map((heading, i) => (
          <g key={heading} transform={`translate(48 ${235 + i * 115})`}>
            <text fontSize={12} fontWeight={700} fill={colors.dialogue}>
              {heading}
            </text>
            <text y={28} fontSize={13} fill={colors.text}>
              {
                [
                  "Bar height = body words. Blue = dialogue; green = action / visual writing.",
                  "Bars = dialogue words. Percentages use all dialogue words in the draft.",
                  "A cell means a speaking cue. Brighter cells mean more dialogue in that scene.",
                  "Counts mean shared speaking scenes, including voiceovers; not proven interaction.",
                  `Dialogue / ${dialogueWpm} wpm + action / ${actionWpm} wpm. Dual dialogue is sequential.`,
                  "Excludes headings, cues, parentheticals, notes, boneyards and title-page text.",
                ][i]
              }
            </text>
          </g>
        ))}
        <text x={48} y={965} fontSize={12} fill={colors.muted}>
          Reading time is an estimate, not performed runtime or formatted page count.
        </text>
        <text x={48} y={993} fontSize={12} fill={colors.muted}>
          {report.preSceneWords} pre-scene words included in totals; charts start at the first heading.
        </text>
        <text x={48} y={1021} fontSize={12} fill={colors.muted}>
          Each chart uses its displayed group for scaling. Values remain exact.
        </text>
      </>
    ),
  });
  if (pages.length > 120)
    throw new Error("This atlas exceeds 120 pages. Export a smaller screenplay or split the draft into parts.");
  return pages;
}

export function renderXrayPrintPage(page: XrayPrintPage, title: string, index: number, total: number): string {
  const colors = XRAY_PRINT_COLORS;
  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="840"
      height="1188"
      viewBox="0 0 840 1188"
      fontFamily="Arial, sans-serif"
    >
      <rect width={840} height={1188} fill={palette.background.paper} />
      <rect x={48} y={42} width={26} height={4} rx={2} fill={colors.dialogue} />
      <rect x={78} y={42} width={16} height={4} rx={2} fill={colors.action} />
      <text x={108} y={48} fill={colors.muted} fontSize={10} letterSpacing={2}>
        ACTONE / X-RAY STORY ATLAS
      </text>
      <text x={48} y={98} fill={colors.text} fontSize={26} fontWeight={700}>
        {short(title || "Untitled screenplay", 48)}
      </text>
      <text x={48} y={146} fill={colors.text} fontSize={21} fontWeight={600}>
        {page.title}
      </text>
      <text x={48} y={171} fill={colors.muted} fontSize={11}>
        {page.subtitle}
      </text>
      {page.content}
      <line x1={48} x2={792} y1={1142} y2={1142} stroke={colors.grid} />
      <text x={48} y={1164} fill={colors.muted} fontSize={9}>
        ACTONE · SCREENPLAY ANALYSIS
      </text>
      <text x={792} y={1164} textAnchor="end" fill={colors.muted} fontSize={10}>
        {index + 1} / {total}
      </text>
    </svg>,
  );
}

export async function rasterizeXrayPage(svg: string): Promise<string> {
  // Data URLs are allowed by the desktop CSP; blob image URLs are not.
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1680;
  canvas.height = 2376;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The chart renderer is unavailable. Please reopen X-Ray.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png").split(",")[1];
}
export async function exportXrayPdf(
  report: XrayReport,
  title: string,
  dialogueWpm: number,
  actionWpm: number,
): Promise<boolean> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window))
    throw new Error("PDF export is available in the desktop app.");
  const pages = buildXrayReport(report, title, dialogueWpm, actionWpm);
  const images: string[] = [];
  for (let i = 0; i < pages.length; i++)
    images.push(await rasterizeXrayPage(renderXrayPrintPage(pages[i], title, i, pages.length)));
  const { invoke } = await import("@tauri-apps/api/core");
  const path = await invoke<string | null>("export_xray_pdf", { pages: images, fileName: title });
  return Boolean(path);
}
