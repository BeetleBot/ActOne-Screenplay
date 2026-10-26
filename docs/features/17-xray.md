# X-Ray Story Atlas

A compact, theme-aware visual dashboard in `?modal=xray`.

- Overview: four compact metrics, stacked scene rhythm (blue dialogue / green action), dialogue-share ring and leading-voice bars. Designed for the existing 700 x 580 window.
- Scenes: searchable, sortable stacked scene rows; selected-scene details and source navigation.
- Cast: dialogue ranking, profile editor, paged character/scene presence heatmap and shared-scene matrix. Cells expose counts through titles, accessible labels and keyboard interaction.
- World: setting and time-of-day rings plus location ranking. Unknown and other values remain explicit.
- Information button: reading rates and methodology, outside the main chart workspace.

`XrayCharts.tsx` contains shared SVG charts. `XrayDashboard.tsx` manages selection, pagination and compact layout. `xray.ts` owns body-word analysis and scene-heading distributions. Text is treated as content; notes and multiline boneyards are excluded while source line indices remain stable.

## Visual PDF

`xrayReport.tsx` paginates the shared charts into an A4 atlas with a light print palette, numerical labels and a measurement key. It includes all scenes, voices, presence cells, locations and connection pairs regardless of current filters. Matrices are tiled into cast groups; the ranked connections section also includes pairs crossing those groups. Images render at 1680 x 2376; the PDF is a visual report, not selectable text. The maximum is 120 pages, with an explicit error beyond this limit.

The frontend rasterizes local SVG using CSP-compatible data URLs. `xray_pdf.rs` validates page count, encoded size, PNG format and dimensions, then composes pages using the existing krilla PDF engine. Its async native command uses a worker for generation and saving, preserves cancellation, and reports write errors. No new dependencies or external services.

## Measurement

Body counts include dialogue and visual/action text, excluding headings, cues, parentheticals and notes. Reading estimate = dialogue words / dialogue rate + action words / action rate, with sequential dual dialogue. It is not performed runtime or page count. Speaking cues include voiceover; silent appearances are not inferred. Shared speaking scenes indicate co-occurrence, not a confirmed relationship. Pre-scene body words appear in totals but not scene charts. Chart scaling is local to the displayed group; absolute values remain labeled.
