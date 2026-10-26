import type { ReactNode } from "react";
import type { XrayCharacter, XrayReport, XrayScene } from "../utils/xray";

export interface ChartColors {
  text: string;
  muted: string;
  grid: string;
  surface: string;
  dialogue: string;
  action: string;
  third: string;
  fourth: string;
}
interface ChartProps {
  colors: ChartColors;
  width?: number;
}
export interface ChartDatum {
  label: string;
  value: number;
  detail?: string;
  lineIndex?: number;
}
const short = (text: string, length: number) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);
const number = (value: number) => value.toLocaleString();

export function ChartSvg({
  width,
  height,
  label,
  children,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMin"
      width="100%"
      role="group"
      aria-label={label}
      style={{ display: "block", fontFamily: "Inter, Arial, sans-serif", overflow: "visible" }}
    >
      {children}
    </svg>
  );
}

function Mark({
  label,
  onClick,
  onFocus,
  children,
}: {
  label: string;
  onClick?: () => void;
  onFocus?: () => void;
  children: ReactNode;
}) {
  return (
    <g
      role={onClick ? "button" : undefined}
      aria-label={label}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

export function RhythmChart({
  scenes,
  colors,
  width = 700,
  onScene,
  onInspect,
  selected,
  height = 220,
}: ChartProps & {
  scenes: XrayScene[];
  onScene?: (scene: XrayScene) => void;
  onInspect?: (scene: XrayScene) => void;
  selected?: number;
  height?: number;
}) {
  const left = 42,
    right = 12,
    top = 20,
    bottom = 32;
  const chartH = height - top - bottom,
    chartW = width - left - right;
  const max = Math.max(10, ...scenes.map((s) => s.words));
  const ceiling = Math.ceil(max / 50) * 50;
  const step = chartW / Math.max(1, scenes.length);
  const barW = Math.min(36, step * 0.72);
  return (
    <ChartSvg width={width} height={height} label="Scene rhythm: dialogue and action words by scene">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={left}
            x2={width - right}
            y1={top + chartH * (1 - t)}
            y2={top + chartH * (1 - t)}
            stroke={colors.grid}
            strokeDasharray={t ? "3 5" : undefined}
          />
          <text x={left - 8} y={top + chartH * (1 - t) + 4} textAnchor="end" fontSize={10} fill={colors.muted}>
            {number(Math.round(ceiling * t))}
          </text>
        </g>
      ))}
      {scenes.map((s, index) => {
        const x = left + index * step + (step - barW) / 2;
        const actionH = (s.actionWords / ceiling) * chartH,
          dialogueH = (s.dialogueWords / ceiling) * chartH;
        return (
          <Mark
            key={s.number}
            label={`Scene ${s.number}: ${s.heading}; ${s.dialogueWords} dialogue, ${s.actionWords} action words`}
            onClick={onScene ? () => onScene(s) : undefined}
            onFocus={onInspect ? () => onInspect(s) : undefined}
          >
            <rect
              x={left + index * step}
              y={top}
              width={step}
              height={chartH}
              fill={colors.dialogue}
              opacity={selected === s.number ? 0.1 : 0}
            />
            <rect
              x={x}
              y={top + chartH - actionH}
              width={barW}
              height={Math.max(s.words ? 0 : 2, actionH)}
              rx={2}
              fill={colors.action}
            />
            <rect
              x={x}
              y={top + chartH - actionH - dialogueH}
              width={barW}
              height={dialogueH}
              rx={2}
              fill={colors.dialogue}
            />
            {(scenes.length <= 30 || index % Math.ceil(scenes.length / 20) === 0 || index === scenes.length - 1) && (
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize={10} fill={colors.muted}>
                {s.number}
              </text>
            )}
          </Mark>
        );
      })}
      {!scenes.length && (
        <text x={width / 2} y={110} textAnchor="middle" fill={colors.muted} fontSize={13}>
          Your scene rhythm will appear here
        </text>
      )}
    </ChartSvg>
  );
}

export function DonutChart({
  data,
  colors,
  width = 330,
  label,
  center,
  dense = false,
}: ChartProps & { data: ChartDatum[]; label: string; center?: string; dense?: boolean }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const palette = [colors.dialogue, colors.action, colors.third, colors.fourth, colors.muted];
  let offset = 0;
  const cx = dense ? 64 : 82,
    cy = dense ? 64 : 89,
    r = dense ? 44 : 57,
    circumference = 2 * Math.PI * r;
  return (
    <ChartSvg width={width} height={dense ? 130 : 180} label={label}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.grid} strokeWidth={17} />
      {data.map((d, i) => {
        const length = total ? (d.value / total) * circumference : 0,
          start = offset;
        offset += length;
        return (
          <circle
            key={d.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth={17}
            strokeDasharray={`${Math.max(0, length - (length && length < circumference ? 3 : 0))} ${circumference}`}
            strokeDashoffset={-start}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${d.label}: ${number(d.value)} (${total ? Math.round((d.value / total) * 100) : 0}%)`}</title>
          </circle>
        );
      })}
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize={25} fontWeight={700} fill={colors.text}>
        {center || number(total)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize={10} fill={colors.muted}>
        {center ? data[0]?.label : "SCENES"}
      </text>
      {data.map((d, i) => (
        <g key={d.label} transform={`translate(170 ${38 + i * 29})`}>
          <circle cx={0} cy={0} r={4} fill={palette[i % palette.length]} />
          <text x={12} y={4} fontSize={11} fill={colors.muted}>
            {short(d.label, 17)}
          </text>
          <text x={width - 180} y={4} textAnchor="end" fontSize={12} fontWeight={600} fill={colors.text}>
            {total ? Math.round((d.value / total) * 100) : 0}%
          </text>
        </g>
      ))}
    </ChartSvg>
  );
}

export function RankedBars({
  data,
  colors,
  width = 500,
  total,
  unit = "words",
  onSelect,
  dense = false,
}: ChartProps & {
  data: ChartDatum[];
  dense?: boolean;
  total?: number;
  unit?: string;
  onSelect?: (datum: ChartDatum) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelW = Math.min(155, width * 0.34),
    end = 85,
    plotW = width - labelW - end;
  const rowH = dense ? 26 : 34;
  const height = Math.max(64, data.length * rowH + 8);
  return (
    <ChartSvg width={width} height={height} label={`Ranked ${unit} distribution`}>
      {data.map((d, i) => (
        <Mark
          key={d.label}
          label={`${d.label}: ${number(d.value)} ${unit}${total ? `, ${Math.round((d.value / total) * 100)}%` : ""}${d.detail ? `; ${d.detail}` : ""}`}
          onClick={onSelect ? () => onSelect(d) : undefined}
        >
          <rect x={0} y={i * rowH} width={width} height={32} fill="transparent" />
          <text x={0} y={i * rowH + 21} fontSize={11} fill={colors.text}>
            {short(d.label, Math.floor(labelW / 7))}
          </text>
          <rect x={labelW} y={i * rowH + 8} width={plotW} height={17} rx={4} fill={colors.grid} opacity={0.5} />
          <rect
            x={labelW}
            y={i * rowH + 8}
            width={(d.value / max) * plotW}
            height={17}
            rx={4}
            fill={i % 2 ? colors.action : colors.dialogue}
          />
          <text x={width - 2} y={i * rowH + 21} textAnchor="end" fontSize={11} fill={colors.text}>
            {number(d.value)}
            {total ? ` / ${Math.round((d.value / total) * 100)}%` : ""}
          </text>
        </Mark>
      ))}
      {!data.length && (
        <text x={width / 2} y={35} textAnchor="middle" fontSize={12} fill={colors.muted}>
          No data yet
        </text>
      )}
    </ChartSvg>
  );
}

export function PresenceChart({
  characters,
  scenes,
  colors,
  width = 700,
  onScene,
}: ChartProps & {
  characters: XrayCharacter[];
  scenes: XrayScene[];
  onScene?: (scene: XrayScene) => void;
}) {
  const left = 125,
    cellW = (width - left - 6) / Math.max(1, scenes.length),
    rowH = 29;
  const height = Math.max(80, characters.length * rowH + 35);
  const max = Math.max(1, ...scenes.flatMap((s) => characters.map((c) => s.speechWords[c.name] || 0)));
  return (
    <ChartSvg width={width} height={height} label="Character presence heatmap: speaking scenes and dialogue intensity">
      {scenes.map(
        (s, i) =>
          (scenes.length <= 30 || i % 5 === 0) && (
            <text
              key={s.number}
              x={left + (i + 0.5) * cellW}
              y={12}
              textAnchor="middle"
              fontSize={9}
              fill={colors.muted}
            >
              {s.number}
            </text>
          ),
      )}
      {characters.map((c, row) => (
        <g key={c.name}>
          <text x={0} y={35 + row * rowH} fontSize={10} fill={colors.text}>
            {short(c.name, 17)}
          </text>
          {scenes.map((s, col) => {
            const words = s.speechWords[c.name] || 0,
              present = s.speakers.includes(c.name);
            return (
              <Mark
                key={s.number}
                label={`${c.name}, scene ${s.number}: ${words} dialogue words${present && !words ? ", cue only" : ""}`}
                onClick={onScene ? () => onScene(s) : undefined}
              >
                <rect
                  x={left + col * cellW + 1}
                  y={20 + row * rowH}
                  width={Math.max(1, cellW - 3)}
                  height={21}
                  rx={3}
                  fill={colors.grid}
                  opacity={0.45}
                />
                {present && (
                  <rect
                    x={left + col * cellW + 1}
                    y={20 + row * rowH}
                    width={Math.max(1, cellW - 3)}
                    height={21}
                    rx={3}
                    fill={colors.dialogue}
                    opacity={0.22 + 0.78 * Math.sqrt(words / max)}
                  />
                )}
              </Mark>
            );
          })}
        </g>
      ))}
      {!characters.length && (
        <text x={width / 2} y={44} textAnchor="middle" fontSize={12} fill={colors.muted}>
          No speaking characters yet
        </text>
      )}
    </ChartSvg>
  );
}

export function ConnectionChart({
  report,
  characters,
  colors,
  width = 600,
  onPair,
}: ChartProps & {
  report: XrayReport;
  characters: XrayCharacter[];
  onPair?: (names: [string, string]) => void;
}) {
  const size = characters.length,
    left = 115,
    top = 35;
  const cell = Math.min(40, (width - left - 20) / Math.max(1, size));
  const pairs = new Map(report.connections.map((c) => [JSON.stringify(c.names), c.scenes.length]));
  const max = Math.max(1, ...report.connections.map((c) => c.scenes.length));
  return (
    <ChartSvg
      width={width}
      height={Math.max(90, top + size * cell + 8)}
      label="Shared-scene matrix: numbers are shared speaking scenes"
    >
      {characters.map((c, i) => (
        <g key={c.name}>
          <text x={left + (i + 0.5) * cell} y={20} textAnchor="middle" fontSize={10} fill={colors.muted}>
            {i + 1}
          </text>
          <text x={0} y={top + (i + 0.5) * cell + 4} fontSize={10} fill={colors.text}>
            {i + 1}. {short(c.name, 14)}
          </text>
          {characters.map((other, j) => {
            const names = [c.name, other.name].sort() as [string, string];
            const value = i === j ? 0 : pairs.get(JSON.stringify(names)) || 0;
            return (
              <Mark
                key={other.name}
                label={`${c.name} + ${other.name}: ${value} shared scenes`}
                onClick={onPair && value ? () => onPair(names) : undefined}
              >
                <rect
                  x={left + j * cell + 1}
                  y={top + i * cell + 1}
                  width={cell - 3}
                  height={cell - 3}
                  rx={4}
                  fill={colors.grid}
                  opacity={0.4}
                />
                {!!value && (
                  <rect
                    x={left + j * cell + 1}
                    y={top + i * cell + 1}
                    width={cell - 3}
                    height={cell - 3}
                    rx={4}
                    fill={colors.action}
                    opacity={0.2 + (0.5 * value) / max}
                  />
                )}
                <text
                  x={left + (j + 0.5) * cell}
                  y={top + (i + 0.5) * cell + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill={value ? colors.text : colors.muted}
                >
                  {i === j ? "—" : value || "·"}
                </text>
              </Mark>
            );
          })}
        </g>
      ))}
      {!size && (
        <text x={width / 2} y={44} textAnchor="middle" fontSize={12} fill={colors.muted}>
          No shared scenes yet
        </text>
      )}
    </ChartSvg>
  );
}

export function SceneRowsChart({
  scenes,
  colors,
  width = 700,
  onScene,
}: ChartProps & { scenes: XrayScene[]; onScene?: (scene: XrayScene) => void }) {
  const max = Math.max(1, ...scenes.map((s) => s.words)),
    plotX = width * 0.48,
    plotW = width * 0.29;
  return (
    <ChartSvg
      width={width}
      height={Math.max(75, scenes.length * 40 + 32)}
      label="Scene breakdown with dialogue and action bars"
    >
      <text x={0} y={12} fill={colors.muted} fontSize={10}>
        SCENE
      </text>
      <text x={plotX} y={12} fill={colors.muted} fontSize={10}>
        DIALOGUE / ACTION
      </text>
      <text x={width - 2} y={12} textAnchor="end" fill={colors.muted} fontSize={10}>
        WORDS / READ
      </text>
      {scenes.map((s, i) => (
        <Mark
          key={s.number}
          label={`${s.number}. ${s.heading}; ${s.words} words; ${s.seconds} seconds reading`}
          onClick={onScene ? () => onScene(s) : undefined}
        >
          <rect x={0} y={22 + i * 40} width={width} height={38} fill="transparent" />
          <text x={0} y={45 + i * 40} fill={colors.text} fontSize={11}>
            {s.number}. {short(s.heading, Math.floor(plotX / 6.5) - 5)}
          </text>
          <rect x={plotX} y={32 + i * 40} width={plotW} height={16} rx={3} fill={colors.grid} opacity={0.35} />
          <rect
            x={plotX}
            y={32 + i * 40}
            width={(s.dialogueWords / max) * plotW}
            height={16}
            rx={2}
            fill={colors.dialogue}
          />
          <rect
            x={plotX + (s.dialogueWords / max) * plotW}
            y={32 + i * 40}
            width={(s.actionWords / max) * plotW}
            height={16}
            rx={2}
            fill={colors.action}
          />
          <text x={width - 2} y={44 + i * 40} textAnchor="end" fill={colors.text} fontSize={10}>
            {s.words} / {Math.floor(s.seconds / 60)}:{String(s.seconds % 60).padStart(2, "0")}
          </text>
        </Mark>
      ))}
      {!scenes.length && (
        <text x={0} y={48} fill={colors.muted} fontSize={12}>
          No matching scenes
        </text>
      )}
    </ChartSvg>
  );
}
