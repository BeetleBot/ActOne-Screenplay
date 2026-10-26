import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { DownloadIcon, InfoOutlinedIcon, CloseIcon } from "./Icons";
import {
  ConnectionChart,
  DonutChart,
  PresenceChart,
  RankedBars,
  RhythmChart,
  SceneRowsChart,
  type ChartColors,
} from "./XrayCharts";
import { summarizeXrayWorld } from "../utils/xray";
import type { XrayReport, XrayScene } from "../utils/xray";

interface XrayDashboardProps {
  report: XrayReport;
  title: string;
  exporting: boolean;
  notices?: ReactNode;
  dialogueWpm: number;
  actionWpm: number;
  onDialogueWpm: (rate: number) => void;
  onActionWpm: (rate: number) => void;
  onExport: () => void;
  onJump: (lineIndex: number) => void;
  onEdit: (name: string) => void;
}

function Panel({
  title,
  detail,
  children,
  action,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, minWidth: 0, overflow: "hidden", flexShrink: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{title}</Typography>
          {detail && (
            <Typography variant="caption" color="text.secondary">
              {detail}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}
function Pager({
  page,
  total,
  size,
  onChange,
  label,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (total <= size) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Button size="small" aria-label={`Previous ${label}`} disabled={page === 0} onClick={() => onChange(page - 1)}>
        ‹
      </Button>
      <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
        {page * size + 1}–{Math.min(total, (page + 1) * size)} / {total}
      </Typography>
      <Button
        size="small"
        aria-label={`Next ${label}`}
        disabled={(page + 1) * size >= total}
        onClick={() => onChange(page + 1)}
      >
        ›
      </Button>
    </Box>
  );
}
function Legend({ colors }: { colors: ChartColors }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5 }}>
      {[
        ["Dialogue", colors.dialogue],
        ["Action", colors.action],
      ].map(([label, color]) => (
        <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <Box sx={{ width: 7, height: 7, bgcolor: color, borderRadius: "50%" }} />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function XrayDashboard({
  report,
  title,
  exporting,
  notices,
  dialogueWpm,
  actionWpm,
  onDialogueWpm,
  onActionWpm,
  onExport,
  onJump,
  onEdit,
}: XrayDashboardProps) {
  const theme = useTheme();
  const colors: ChartColors = {
    text: theme.palette.text.primary,
    muted: theme.palette.text.secondary,
    grid: theme.palette.divider,
    surface: theme.palette.background.paper,
    dialogue: theme.palette.mode === "dark" ? theme.palette.info.light : theme.palette.info.dark,
    action: theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark,
    third: theme.palette.warning.main,
    fourth: theme.palette.secondary.main,
  };
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("script");
  const [scenePage, setScenePage] = useState(0);
  const [rhythmPage, setRhythmPage] = useState(0);
  const [castPage, setCastPage] = useState(0);
  const [worldPage, setWorldPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [method, setMethod] = useState(false);
  const world = useMemo(() => summarizeXrayWorld(report), [report]);
  const scenes = useMemo(
    () =>
      report.scenes
        .filter((s) => `${s.heading} ${s.location} ${s.speakers.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) =>
          sort === "length"
            ? b.words - a.words
            : sort === "dialogue"
              ? b.dialogueWords / (b.words || 1) - a.dialogueWords / (a.words || 1)
              : a.number - b.number,
        ),
    [report, query, sort],
  );
  const cast = report.characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const safeScenePage = Math.min(scenePage, Math.max(0, Math.ceil(scenes.length / 8) - 1));
  const safeCastPage = Math.min(castPage, Math.max(0, Math.ceil(cast.length / 8) - 1));
  const safeRhythmPage = Math.min(rhythmPage, Math.max(0, Math.ceil(report.scenes.length / 40) - 1));
  const safeWorldPage = Math.min(worldPage, Math.max(0, Math.ceil(world.locations.length / 15) - 1));
  const visibleScenes = report.scenes.slice(safeRhythmPage * 40, (safeRhythmPage + 1) * 40);
  const visibleCast = cast.slice(safeCastPage * 8, (safeCastPage + 1) * 8);
  const activeScene = report.scenes.find((s) => s.number === selected);
  const activeCharacter = report.characters.find((c) => c.name === character);
  const activePair = pair
    ? report.connections.find((c) => c.names[0] === pair[0] && c.names[1] === pair[1])
    : undefined;
  const selectScene = (scene: XrayScene) => {
    setSelected(scene.number);
  };
  const castData = (limit?: number) =>
    (limit ? report.characters.slice(0, limit) : visibleCast).map((c) => ({
      label: c.name,
      value: c.words,
      detail: `${c.scenes.length} speaking scenes`,
    }));
  const grid = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1.5 };
  const scenePager = (
    <Pager page={safeRhythmPage} total={report.scenes.length} size={40} onChange={setRhythmPage} label="chart scenes" />
  );
  return (
    <>
      <Box
        sx={{
          px: 2.5,
          pt: 1,
          pb: 0.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 10, letterSpacing: ".18em", fontWeight: 700, color: "text.secondary" }}>
            X-RAY · STORY ATLAS
          </Typography>
          <Typography noWrap title={title} sx={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.03em", mt: 0.4 }}>
            {title || "Untitled screenplay"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
          <Tooltip title="How these numbers work">
            <IconButton aria-label="Analysis settings" onClick={() => setMethod(true)}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={onExport}>
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </Box>
      </Box>
      <Tabs
        value={tab}
        onChange={(_, value: number) => {
          setTab(value);
          setQuery("");
          setScenePage(0);
          setCastPage(0);
        }}
        aria-label="X-Ray analysis views"
        sx={{ px: 1, flexShrink: 0, minHeight: 32, "& .MuiTab-root": { minHeight: 32, py: 0.5, fontSize: 11 } }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {["Overview", "Scenes", "Cast", "World"].map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        aria-label={["Overview", "Scenes", "Cast", "World"][tab]}
        sx={{ overflow: "auto", minHeight: 0, flex: 1, p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {notices}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1 }}>
          {[
            [report.scenes.length, "SCENES"],
            [report.characters.length, "VOICES"],
            [report.words.toLocaleString(), "BODY WORDS"],
            [`${Math.floor(report.seconds / 60)}:${String(report.seconds % 60).padStart(2, "0")}`, "EST. READING"],
          ].map(([value, label], index) => (
            <Box key={label} sx={{ px: 1.5, py: 0.75, bgcolor: "background.paper", borderRadius: 2 }}>
              <Typography
                sx={{
                  fontSize: { xs: 19, sm: 21 },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: index === 0 ? colors.dialogue : index === 1 ? colors.action : "text.primary",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {value}
              </Typography>
              <Typography sx={{ fontSize: 8.5, letterSpacing: ".07em", color: "text.secondary", mt: 0.5 }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
        {tab === 0 && (
          <>
            <Panel title="Scene rhythm" action={<Legend colors={colors} />}>
              <RhythmChart
                scenes={visibleScenes}
                height={125}
                colors={colors}
                selected={selected ?? undefined}
                onScene={selectScene}
                onInspect={(s) => setSelected(s.number)}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {activeScene
                    ? `${activeScene.number}. ${activeScene.heading} · ${activeScene.words} words`
                    : "Select a scene to explore"}
                </Typography>
                {activeScene && (
                  <Button size="small" onClick={() => onJump(activeScene.lineIndex)}>
                    Open scene
                  </Button>
                )}
                {scenePager}
              </Box>
            </Panel>
            <Box sx={grid}>
              <Panel title="Story balance">
                <DonutChart
                  dense
                  colors={colors}
                  label="Dialogue and action word share"
                  center={`${Math.round((report.dialogueWords / (report.words || 1)) * 100)}%`}
                  data={[
                    { label: "Dialogue", value: report.dialogueWords },
                    { label: "Action", value: report.actionWords },
                  ]}
                />
              </Panel>
              <Panel
                title="Leading voices"
                action={
                  <Button size="small" onClick={() => setTab(2)}>
                    All cast
                  </Button>
                }
              >
                <RankedBars
                  dense
                  colors={colors}
                  width={350}
                  data={castData(5)}
                  total={report.dialogueWords}
                  onSelect={(d) => {
                    setCharacter(d.label);
                    setTab(2);
                  }}
                />
              </Panel>
            </Box>
          </>
        )}
        {tab === 1 && (
          <>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Search scenes, locations or speakers"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setScenePage(0);
                }}
              />
              <TextField
                select
                size="small"
                label="Sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setScenePage(0);
                }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="script">Script order</MenuItem>
                <MenuItem value="length">Longest first</MenuItem>
                <MenuItem value="dialogue">Dialogue share</MenuItem>
              </TextField>
            </Box>
            <Panel title="Scene by scene" action={<Legend colors={colors} />}>
              <SceneRowsChart
                scenes={scenes.slice(safeScenePage * 8, (safeScenePage + 1) * 8)}
                colors={colors}
                onScene={selectScene}
              />
              <Pager page={safeScenePage} total={scenes.length} size={8} onChange={setScenePage} label="scenes" />
            </Panel>
            {activeScene && (
              <Panel
                title={`${activeScene.number}. ${activeScene.heading}`}
                action={
                  <Button size="small" onClick={() => onJump(activeScene.lineIndex)}>
                    Open scene
                  </Button>
                }
              >
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip size="small" label={`${activeScene.words} words`} />
                  <Chip size="small" label={`${activeScene.speakers.length} voices`} />
                  <Chip
                    size="small"
                    label={`${Math.round((activeScene.dialogueWords / (activeScene.words || 1)) * 100)}% dialogue`}
                  />
                  {activeScene.speakers.map((name) => (
                    <Chip
                      key={name}
                      size="small"
                      label={name}
                      onClick={() => {
                        setCharacter(name);
                        setQuery("");
                        setTab(2);
                      }}
                    />
                  ))}
                </Box>
                {report.findings
                  .filter(
                    (f) =>
                      f.lineIndex >= activeScene.lineIndex &&
                      f.lineIndex < (report.scenes[activeScene.number]?.lineIndex ?? Infinity),
                  )
                  .map((f, i) => (
                    <Tooltip key={i} title={f.detail}>
                      <Button size="small" sx={{ mt: 1 }} onClick={() => onJump(f.lineIndex)}>
                        {f.title}
                      </Button>
                    </Tooltip>
                  ))}
              </Panel>
            )}
          </>
        )}
        {tab === 2 && (
          <>
            <TextField
              fullWidth
              size="small"
              label="Search characters"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCastPage(0);
              }}
            />
            <Panel
              title="Dialogue share"
              detail="Words / share of all dialogue"
              action={
                <Pager page={safeCastPage} total={cast.length} size={8} onChange={setCastPage} label="characters" />
              }
            >
              <RankedBars
                dense
                data={castData()}
                total={report.dialogueWords}
                colors={colors}
                width={700}
                onSelect={(d) => setCharacter(d.label)}
              />
            </Panel>
            {activeCharacter && (
              <Panel
                title={activeCharacter.name}
                action={
                  <Button size="small" onClick={() => onEdit(activeCharacter.name)}>
                    Edit profile
                  </Button>
                }
              >
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip size="small" label={`${activeCharacter.speeches} speeches`} />
                  <Chip size="small" label={`${activeCharacter.scenes.length} speaking scenes`} />
                  <Button size="small" onClick={() => onJump(activeCharacter.firstLine)}>
                    First appearance
                  </Button>
                </Box>
              </Panel>
            )}
            <Panel title="Speaking presence" detail="Scene number → · brighter = more dialogue" action={scenePager}>
              <PresenceChart
                characters={visibleCast}
                scenes={visibleScenes}
                colors={colors}
                onScene={(s) => {
                  selectScene(s);
                  setQuery("");
                  setTab(1);
                }}
              />
            </Panel>
            <Panel title="Shared-scene connections" detail="Current cast group · counts are shared speaking scenes">
              <ConnectionChart report={report} characters={visibleCast} colors={colors} onPair={setPair} />
              {activePair && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    {activePair.names.join(" + ")} · {activePair.scenes.length} shared scenes
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                    {activePair.scenes.map((n) => (
                      <Chip key={n} size="small" label={n} onClick={() => onJump(report.scenes[n - 1].lineIndex)} />
                    ))}
                  </Box>
                </Box>
              )}
            </Panel>
          </>
        )}
        {tab === 3 && (
          <>
            <Box sx={grid}>
              <Panel title="Inside / outside" detail="Scene headings">
                <DonutChart colors={colors} label="Interior and exterior scene distribution" data={world.settings} />
              </Panel>
              <Panel title="Day / night" detail="Scene headings">
                <DonutChart colors={colors} label="Time of day scene distribution" data={world.times} />
              </Panel>
            </Box>
            <Panel
              title="Locations"
              detail={`${world.locations.length} places · scenes per location`}
              action={
                <Pager
                  page={safeWorldPage}
                  total={world.locations.length}
                  size={15}
                  onChange={setWorldPage}
                  label="locations"
                />
              }
            >
              <RankedBars
                colors={colors}
                width={700}
                unit="scenes"
                data={world.locations.slice(safeWorldPage * 15, (safeWorldPage + 1) * 15)}
                onSelect={(d) => {
                  setTab(1);
                  setQuery(d.label === "Unspecified location" ? "" : d.label);
                  setScenePage(0);
                }}
              />
            </Panel>
          </>
        )}
      </Box>
      <Dialog open={method} onClose={() => setMethod(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Analysis settings
          <IconButton aria-label="Close settings" onClick={() => setMethod(false)} sx={{ float: "right" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, my: 2 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Dialogue words / minute"
              value={dialogueWpm}
              onChange={(e) => onDialogueWpm(Number(e.target.value))}
            >
              {[120, 150, 180].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Action words / minute"
              value={actionWpm}
              onChange={(e) => onActionWpm(Number(e.target.value))}
            >
              {[150, 200, 250].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Reading time uses these word rates; it does not predict screen runtime. Body words exclude headings, cues,
            parentheticals and notes. Dual dialogue is counted sequentially. Presence and connections use speaking cues,
            including voiceovers.
          </Typography>
          {!!report.preSceneWords && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {report.preSceneWords} words before the first heading are included in totals.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
