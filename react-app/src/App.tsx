import { useEffect, useMemo, useState } from "react";
import {
  assetHealth,
  assets,
  baseTags,
  fabricSteps,
  relationships,
  scenarios,
  type AssetHealth,
  type ScenarioId,
  type Status,
  type TagState
} from "./demoData";

type Screen = "control" | "process" | "ontology" | "fabric";

const demoSteps = [
  "Set the scene: offshore production and refinery operations are normally fragmented across asset hierarchies, PI tags, events, and business KPIs.",
  "Show the control room: operators see health, reliability, throughput, alerts, and recommended action in one place.",
  "Open PI Vision-style view: live tag movement feels familiar to operations teams, but the semantic context explains why it matters.",
  "Switch scenario: compressor, separator, or refinery issues change telemetry, health, and business impact immediately.",
  "Open backend: super users inspect ontology relationships and Fabric data model mapping."
];

const presenterNotes = [
  "Opening line: this demo shows how an ontology turns fragmented operational data into a live, explainable digital twin.",
  "Point out that operators start with health and action, not tables or architecture.",
  "Emphasize that familiar PI-style telemetry is still present, but now connected to assets, failure modes, and KPIs.",
  "Use one scenario at a time. Let the customer see cause, impact, and recommended action change together.",
  "Only move to backend screens if the audience asks how the model is implemented in Fabric."
];

function statusClass(status: Status) {
  return status.toLowerCase();
}

function format(value: number, precision = 1) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision
  });
}

function useLiveTags(scenario: ScenarioId) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const t = Date.now() / 1000;
    return baseTags.map((tag): TagState => {
      let value = tag.value + Math.sin(t / 7 + tag.tagId.length) * (tag.normalMax - tag.normalMin) * 0.015;
      if (scenario === "compressor" && tag.assetId.includes("K101")) {
        if (tag.tagId.includes("VIB")) value = 5.1 + Math.sin(t / 3) * 0.6;
        if (tag.tagId.includes("TEMP")) value = 88 + Math.sin(t / 5) * 3;
        if (tag.tagId.includes("DP")) value = 116 + Math.sin(t / 6) * 3;
      }
      if (scenario === "separator" && tag.assetId === "OPH-A-V101") {
        if (tag.tagId.includes("LEVEL")) value = 62 + Math.sin(t * 1.4) * 14;
        if (tag.tagId.includes("PRESS")) value = 31 + Math.sin(t) * 4;
      }
      if (scenario === "refinery") {
        if (tag.assetId === "ORC-B-H101" && tag.tagId.includes("FUEL")) value = 4050 + Math.sin(t / 4) * 180;
        if (tag.assetId === "ORC-B-H101" && tag.tagId.includes("TEMP")) value = 338 + Math.sin(t / 6) * 4;
        if (tag.assetId === "ORC-B-C101" && tag.tagId.includes("DP")) value = 83 + Math.sin(t / 5) * 5;
      }
      return { ...tag, value };
    });
  }, [scenario, tick]);
}

function tagMap(tags: TagState[]) {
  return Object.fromEntries(tags.map((tag) => [tag.tagId, tag]));
}

function MetricCard({
  title,
  value,
  unit,
  status,
  description
}: {
  title: string;
  value: number;
  unit: string;
  status: Status;
  description: string;
}) {
  return (
    <article className={`card metric ${statusClass(status)}`}>
      <div className="cardHeader">
        <span>{title}</span>
        <StatusPill status={status} />
      </div>
      <div className="metricValue">
        {format(value, unit === "boe/d" ? 0 : 1)}
        <span>{unit}</span>
      </div>
      <div className="bar">
        <div className="fill" style={{ width: `${Math.max(5, Math.min(100, value))}%` }} />
      </div>
      <p>{description}</p>
    </article>
  );
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status ${statusClass(status)}`}>
      <i />
      {status}
    </span>
  );
}

function ControlRoom({ tags, scenario }: { tags: TagState[]; scenario: ScenarioId }) {
  const byTag = tagMap(tags);
  const vib = byTag["TAG-OPH-A-K101-VIB-PV"].value;
  const dp = byTag["TAG-ORC-B-C101-DP-PV"].value;
  const throughput = byTag["TAG-OPH-A-W01-FLOW-PV"].value;
  const gasReliability = Math.max(62, 93 - Math.max(0, vib - 3.8) * 9);
  const portfolio = Math.max(72, 92 - Math.max(0, vib - 4.2) * 4 - Math.max(0, dp - 76) * 1.2);
  const constraintRisk = Math.max(45, 85 - Math.max(0, dp - 70) * 2.1);

  return (
    <section className="grid">
      <MetricCard title="Portfolio health" value={portfolio} unit="/100" status={portfolio > 85 ? "Normal" : "Watch"} description="Roll-up across ontology-linked critical assets" />
      <MetricCard title="Production throughput" value={throughput} unit="boe/d" status="Normal" description="Well W01 flow translated through digital thread" />
      <MetricCard title="Gas export reliability" value={gasReliability} unit="%" status={gasReliability > 85 ? "Normal" : "Watch"} description="Compressor health impact on export confidence" />
      <MetricCard title="Refinery constraint margin" value={constraintRisk} unit="/100" status={constraintRisk > 70 ? "Watch" : "Degraded"} description="Column differential pressure and heater efficiency risk" />

      <article className="card wide">
        <div className="cardHeader">
          <span>Critical asset health</span>
          <small>Scenario: {scenarios[scenario].name}</small>
        </div>
        <table>
          <thead>
            <tr><th>Asset</th><th>Area</th><th>Health</th><th>Status</th><th>Diagnostic</th><th>Action</th></tr>
          </thead>
          <tbody>
            {assetHealth.map((asset) => (
              <HealthRow key={asset.assetId} asset={adjustHealth(asset, scenario)} />
            ))}
          </tbody>
        </table>
      </article>

      <article className="card side">
        <div className="cardHeader"><span>Semantic event impact</span></div>
        <div className="eventStack">
          <EventCard severity="High" title="Compressor K101 vibration" detail="Likely bearing degradation affecting gas export reliability, compression efficiency, and throughput." />
          <EventCard severity="Medium" title="Separator V101 level instability" detail="Possible liquid carryover risk and downstream gas compression upset." />
          <EventCard severity="Medium" title="Heater H101 efficiency drift" detail="Higher fuel cost and emissions per unit of refinery throughput." />
        </div>
      </article>

      <article className="card wide">
        <div className="cardHeader">
          <span>Alert timeline and shift handover</span>
          <small>Live demo polish</small>
        </div>
        <div className="timeline">
          <TimelineItem time="10:02" severity="Normal" title="Stable production baseline" detail="Well W01, inlet separator, and crude charge all inside expected range." />
          <TimelineItem time="10:07" severity="Watch" title="K101 vibration trend" detail="Vibration and bearing temperature begin to correlate with reduced compression efficiency." />
          <TimelineItem time="10:14" severity="Degraded" title="Semantic impact raised" detail="Ontology maps K101 to gas export reliability and production throughput risk." />
          <TimelineItem time="10:21" severity="Watch" title="Recommended action" detail="Add compressor reliability check to shift handover and inspect lube oil/bearing condition." />
        </div>
      </article>

      <article className="card side">
        <div className="cardHeader"><span>Demo talk track</span></div>
        <div className="talkTrack">
          <strong>Message to customer</strong>
          <p>Fabric is not just storing time-series data; the ontology turns raw tags into asset, process, reliability, and business context.</p>
          <p>That means the same live signal can drive operator action, reliability prioritization, and executive KPI impact.</p>
        </div>
      </article>
    </section>
  );
}

function adjustHealth(asset: AssetHealth, scenario: ScenarioId): AssetHealth {
  if (scenario === "compressor" && asset.assetId === "OPH-A-K101") return { ...asset, score: 63.5, status: "Degraded", action: "Inspect bearing/lube oil condition; consider load reduction." };
  if (scenario === "separator" && asset.assetId === "OPH-A-V101") return { ...asset, score: 68.8, status: "Degraded", action: "Review level control loop and inlet slugging." };
  if (scenario === "refinery" && asset.assetId === "ORC-B-C101") return { ...asset, score: 58.4, status: "Degraded", action: "Review CDU hydraulic envelope and draw balance." };
  if (scenario === "refinery" && asset.assetId === "ORC-B-H101") return { ...asset, score: 72.5, status: "Watch", action: "Check burner balance and fouling indicators." };
  if (scenario === "normal") return { ...asset, score: Math.max(asset.score, 88), status: "Normal" };
  return asset;
}

function HealthRow({ asset }: { asset: AssetHealth }) {
  return (
    <tr className={statusClass(asset.status)}>
      <td><strong>{asset.assetName}</strong><br /><small>{asset.assetId}</small></td>
      <td>{asset.area}</td>
      <td><span className="mono">{asset.score.toFixed(1)}</span><div className="bar mini"><div className="fill" style={{ width: `${asset.score}%` }} /></div></td>
      <td><StatusPill status={asset.status} /></td>
      <td>{asset.diagnostic}</td>
      <td>{asset.action}</td>
    </tr>
  );
}

function EventCard({ severity, title, detail }: { severity: Status | "High" | "Medium"; title: string; detail: string }) {
  const status = severity === "High" ? "critical" : severity === "Medium" ? "watch" : "normal";
  return (
    <div className={`event ${status}`}>
      <div><strong>{title}</strong><span>{severity}</span></div>
      <p>{detail}</p>
    </div>
  );
}

function TimelineItem({ time, severity, title, detail }: { time: string; severity: Status; title: string; detail: string }) {
  return (
    <div className={`timelineItem ${statusClass(severity)}`}>
      <span className="mono">{time}</span>
      <i />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function ProcessMimic({ tags }: { tags: TagState[] }) {
  const byTag = tagMap(tags);
  return (
    <section className="processShell">
      <div className="visionBar">
        <strong>PI Vision-style Process Overview</strong>
        <span>Synthetic live replay | Offshore hub + refinery complex</span>
      </div>
      <div className="canvas">
        <div className="canvasTitle">PROCESS OVERVIEW</div>
        <div className="legend"><span>Normal</span><span>Watch</span><span>Alarm</span></div>
        <Pipe x={70} y={170} w={240} variant="normal" />
        <Pipe x={310} y={170} w={180} variant="normal" />
        <Pipe x={490} y={170} w={280} variant="watch" />
        <Pipe x={490} y={280} w={250} variant="normal" />
        <Pipe x={740} y={280} w={230} variant="normal" />
        <Pipe x={970} y={280} w={180} variant="watch" />
        <Pipe x={1150} y={280} w={160} variant="alarm" />
        <Unit kind="vessel" x={250} y={145} label="INLET SEP V101" />
        <Unit kind="pump" x={520} y={260} label="OIL P101" />
        <Unit kind="compressor" x={780} y={145} label="GAS K101" />
        <Unit kind="tank" x={980} y={220} label="CRUDE T101" />
        <Unit kind="pump" x={1100} y={260} label="CHG P101" />
        <Unit kind="heater" x={1220} y={230} label="HEATER H101" />
        <Unit kind="column" x={1370} y={150} label="ATM C101" />
        <TagBox x={70} y={120} tag={byTag["TAG-OPH-A-W01-THP-PV"]} />
        <TagBox x={155} y={215} tag={byTag["TAG-OPH-A-W01-FLOW-PV"]} />
        <TagBox x={260} y={88} tag={byTag["TAG-OPH-A-V101-PRESS-PV"]} />
        <TagBox x={350} y={140} tag={byTag["TAG-OPH-A-V101-LEVEL-PV"]} />
        <TagBox x={770} y={82} tag={byTag["TAG-OPH-A-K101-VIB-PV"]} />
        <TagBox x={850} y={215} tag={byTag["TAG-OPH-A-K101-TEMP-PV"]} />
        <TagBox x={990} y={160} tag={byTag["TAG-ORC-B-T101-LEVEL-PV"]} />
        <TagBox x={1080} y={320} tag={byTag["TAG-ORC-B-P101-FLOW-PV"]} />
        <TagBox x={1210} y={165} tag={byTag["TAG-ORC-B-H101-FUEL-PV"]} />
        <TagBox x={1280} y={320} tag={byTag["TAG-ORC-B-H101-TEMP-PV"]} />
        <TagBox x={1350} y={90} tag={byTag["TAG-ORC-B-C101-DP-PV"]} />
        <aside className="mimicInsight">
          <h3>Semantic context</h3>
          <p>K101 telemetry is linked to Gas Processing, Gas Export Reliability, Compression Efficiency, and bearing degradation failure mode.</p>
          <p>H101 and C101 tags jointly indicate fired heater efficiency drift and emerging CDU constraint risk.</p>
        </aside>
      </div>
    </section>
  );
}

function Pipe({ x, y, w, variant }: { x: number; y: number; w: number; variant: string }) {
  return <div className={`pipe ${variant}`} style={{ left: x, top: y, width: w }} />;
}

function Unit({ kind, x, y, label }: { kind: string; x: number; y: number; label: string }) {
  return <div className={`unit ${kind}`} style={{ left: x, top: y }}>{label}</div>;
}

function TagBox({ x, y, tag }: { x: number; y: number; tag: TagState }) {
  const status = tag.value > tag.normalMax || tag.value < tag.normalMin ? "alarm" : tag.value > tag.normalMax * 0.9 ? "watch" : "normal";
  return (
    <div className={`tagBox ${status}`} style={{ left: x, top: y }}>
      <b>{format(tag.value, tag.precision)}</b>
      <span>{tag.unit}</span>
      <small>{tag.label}</small>
    </div>
  );
}

function OntologyBrowser({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const selectedAsset = assets.find((asset) => asset.id === selected) ?? assets[0];
  const children = assets.filter((asset) => asset.parentId === selectedAsset.id);
  const edges = relationships.filter((edge) => edge.source === selectedAsset.id || edge.target === selectedAsset.id);
  const tags = baseTags.filter((tag) => tag.assetId === selectedAsset.id);

  return (
    <section className="ontologyLayout">
      <article className="card tree">
        <div className="cardHeader"><span>Digital spine</span><small>Asset hierarchy</small></div>
        <div className="treeList">
          {assets.map((asset) => (
            <button key={asset.id} className={asset.id === selectedAsset.id ? "selected" : ""} style={{ paddingLeft: `${depth(asset.id) * 14 + 10}px` }} onClick={() => onSelect(asset.id)}>
              <span>{asset.name}</span>
              <small>{asset.classId}</small>
            </button>
          ))}
        </div>
      </article>
      <article className="card detail">
        <div className="cardHeader">
          <span>{selectedAsset.name}</span>
          <small>{selectedAsset.domain}</small>
        </div>
        <div className="detailGrid">
          <Info label="Asset ID" value={selectedAsset.id} />
          <Info label="Class" value={selectedAsset.classId} />
          <Info label="Parent" value={selectedAsset.parentId ?? "Root"} />
          <Info label="Child assets" value={String(children.length)} />
        </div>
        <h3>Semantic relationships</h3>
        <div className="chips">
          {edges.map((edge) => <span key={`${edge.source}-${edge.type}-${edge.target}`}>{edge.source} -- {edge.type} -- {edge.target}</span>)}
          {edges.length === 0 && <span>No direct relationship edges in compact demo view</span>}
        </div>
        <h3>Telemetry tags</h3>
        <div className="chips">
          {tags.map((tag) => <span key={tag.tagId}>{tag.tagId} ({tag.unit})</span>)}
          {tags.length === 0 && <span>No direct telemetry tags on this node</span>}
        </div>
        <h3>Impact trace</h3>
        <div className="impactTrace">
          <div><strong>Raw signal</strong><span>{tags[0]?.tagId ?? "No direct tag"}</span></div>
          <div><strong>Asset context</strong><span>{selectedAsset.name}</span></div>
          <div><strong>Semantic relationship</strong><span>{edges[0]?.type ?? "contains / isPartOf"}</span></div>
          <div><strong>Business meaning</strong><span>{selectedAsset.id.includes("K101") ? "Gas export reliability and compression efficiency risk" : selectedAsset.id.includes("C101") ? "Refinery utilization and energy intensity risk" : "Operational health and hierarchy context"}</span></div>
        </div>
        <h3>Relationship graph</h3>
        <div className="graphStrip">
          {edges.slice(0, 5).map((edge) => (
            <div className="graphEdge" key={`${edge.source}-${edge.type}-${edge.target}`}>
              <span>{edge.source}</span><b>{edge.type}</b><span>{edge.target}</span>
            </div>
          ))}
          {edges.length === 0 && <div className="graphEdge"><span>{selectedAsset.parentId ?? "root"}</span><b>contains</b><span>{selectedAsset.id}</span></div>}
        </div>
      </article>
    </section>
  );
}

function depth(assetId: string): number {
  let current = assets.find((asset) => asset.id === assetId);
  let count = 0;
  while (current?.parentId) {
    count += 1;
    current = assets.find((asset) => asset.id === current?.parentId);
  }
  return count;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info"><small>{label}</small><strong>{value}</strong></div>;
}

function FabricView() {
  return (
    <section className="fabric">
      <article className="card backendHero">
        <div className="cardHeader"><span>Backend and super-user section</span><small>Fabric implementation view</small></div>
        <div className="backendBody">
          <strong>This section is intentionally separated from the operator journey.</strong>
          <p>Control room and PI Vision-style screens are for normal users. Ontology and Fabric screens are for super users, architects, data engineers, and reliability specialists who need to understand how semantic context is built and governed.</p>
        </div>
      </article>
      <article className="card">
        <div className="cardHeader"><span>Fabric data model mapping</span><small>Medallion + real-time path</small></div>
        <div className="flow">
          {fabricSteps.map(([title, detail], index) => (
            <div className="flowStep" key={title}>
              <i>{index + 1}</i>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="card">
        <div className="cardHeader"><span>Core Fabric tables</span><small>12-table starter model</small></div>
        <div className="tableGrid">
          {["DimAsset", "DimAssetClass", "BridgeAssetRelationship", "DimTelemetryTag", "FactTelemetry", "FactEventFrame", "DimFailureMode", "DimKPI", "FactKPITimeSeries", "FactAssetHealth", "BridgeEventImpact", "DimRelationshipType"].map((table) => (
            <span key={table}>{table}</span>
          ))}
        </div>
      </article>
    </section>
  );
}

function DemoGuide({
  step,
  setStep,
  presentationMode,
  autoAdvance,
  setAutoAdvance,
  resetDemo
}: {
  step: number;
  setStep: (step: number) => void;
  presentationMode: boolean;
  autoAdvance: boolean;
  setAutoAdvance: (enabled: boolean) => void;
  resetDemo: () => void;
}) {
  return (
    <section className="demoGuide">
      <div>
        <strong>{presentationMode ? "Customer presentation mode" : "Guided customer demo"}</strong>
        <p>{demoSteps[step]}</p>
        {presentationMode && <em>{presenterNotes[step]}</em>}
      </div>
      <div className="guideControls">
        <button onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
        <span>{step + 1} / {demoSteps.length}</span>
        <button onClick={() => setStep(Math.min(demoSteps.length - 1, step + 1))}>Next</button>
        {presentationMode && <button className={autoAdvance ? "active" : ""} onClick={() => setAutoAdvance(!autoAdvance)}>{autoAdvance ? "Pause auto" : "Auto-advance"}</button>}
        {presentationMode && <button onClick={resetDemo}>Customer reset</button>}
      </div>
    </section>
  );
}

function CopilotPanel({
  screen,
  scenario,
  selectedAsset,
  tags
}: {
  screen: Screen;
  scenario: ScenarioId;
  selectedAsset: string;
  tags: TagState[];
}) {
  const [answer, setAnswer] = useState("Ask a question or use a suggested prompt. I will explain the live demo data, ontology relationships, and Fabric impact.");
  const [question, setQuestion] = useState("");
  const prompts = copilotPrompts(screen);

  function ask(prompt: string) {
    const byTag = tagMap(tags);
    const vib = byTag["TAG-OPH-A-K101-VIB-PV"].value;
    const dp = byTag["TAG-ORC-B-C101-DP-PV"].value;
    const selected = assets.find((asset) => asset.id === selectedAsset);
    const normalized = prompt.toLowerCase();

    if (normalized.includes("risk") || normalized.includes("attention")) {
      setAnswer(`The highest current risk is ${scenario === "refinery" ? "the refinery CDU constraint: C101 differential pressure is around " + format(dp, 1) + " kPa and heater fuel demand is elevated." : "gas compressor K101: vibration is around " + format(vib, 1) + " mm/s and is mapped to gas export reliability through the ontology."}`);
    } else if (normalized.includes("relationship") || normalized.includes("ontology")) {
      setAnswer(`${selected?.name ?? "The selected asset"} sits in the digital spine as ${selected?.classId ?? "an asset"}. Its relationships connect raw telemetry to process flow, failure modes, and KPIs, which is why the app can explain business impact rather than only showing tag values.`);
    } else if (normalized.includes("fabric")) {
      setAnswer("Fabric implementation path: Eventstream ingests the live PI-style replay, Eventhouse serves hot telemetry, Lakehouse stores ontology and historical facts, and the Direct Lake semantic model exposes health, reliability, throughput, energy, and emissions measures.");
    } else if (normalized.includes("customer") || normalized.includes("tell")) {
      setAnswer("Customer storyline: start with fragmented OT/IT data, introduce the ontology as the digital spine, show live telemetry as the digital thread, then demonstrate how Fabric converts an abnormal tag into asset health, KPI impact, and recommended action.");
    } else {
      setAnswer(`For ${scenarios[scenario].name}, the important insight is that telemetry, asset hierarchy, and KPI semantics are linked. This lets a user move from live tag behaviour to cause, impact, and action in one workflow.`);
    }
  }

  return (
    <aside className="copilotPanel">
      <div className="cardHeader"><span>Copilot insights</span><small>Demo assistant</small></div>
      <div className="copilotBody">
        <div className="promptGrid">
          {prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}
        </div>
        <div className="copilotAnswer">{answer}</div>
        <form onSubmit={(event) => { event.preventDefault(); ask(question); }}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about risk, ontology, Fabric, or customer story..." />
          <button type="submit">Ask</button>
        </form>
      </div>
    </aside>
  );
}

function copilotPrompts(screen: Screen) {
  if (screen === "control") return ["What needs attention?", "Tell me the customer story", "What is the business impact?"];
  if (screen === "process") return ["Explain these tag changes", "What is abnormal?", "Trace this to KPIs"];
  if (screen === "ontology") return ["Explain the relationships", "Why does ontology matter?", "Show impact path"];
  return ["Explain Fabric architecture", "How does real-time flow work?", "What tables power this?"];
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("control");
  const [scenario, setScenario] = useState<ScenarioId>("compressor");
  const [selectedAsset, setSelectedAsset] = useState("OPH-A-K101");
  const [demoStep, setDemoStep] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const tags = useLiveTags(scenario);
  const isOperationsScreen = screen === "control" || screen === "process";

  useEffect(() => {
    if (!presentationMode || !autoAdvance) return;
    const id = window.setInterval(() => {
      setDemoStep((step) => {
        const next = step >= demoSteps.length - 1 ? 0 : step + 1;
        if (next === 0) {
          setScreen("control");
          setScenario("normal");
        } else if (next === 1) {
          setScreen("control");
          setScenario("compressor");
        } else if (next === 2) {
          setScreen("process");
          setScenario("separator");
        } else if (next === 3) {
          setScreen("control");
          setScenario("refinery");
        } else {
          setScreen("ontology");
          setScenario("compressor");
        }
        return next;
      });
    }, 12000);
    return () => window.clearInterval(id);
  }, [presentationMode, autoAdvance]);

  function resetDemo() {
    setScreen("control");
    setScenario("normal");
    setSelectedAsset("OPH-A-K101");
    setDemoStep(0);
    setAutoAdvance(false);
  }

  function togglePresentationMode() {
    const next = !presentationMode;
    setPresentationMode(next);
    if (next) {
      setScreen("control");
      setScenario("normal");
      setDemoStep(0);
    } else {
      setAutoAdvance(false);
    }
  }

  return (
    <div className={`app ${presentationMode ? "presentation" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="mark">DT</div>
          <div>
            <h1>O&G Digital Twin React Demo</h1>
            <p>Ontology-driven Fabric semantic model with live PI-style telemetry replay</p>
          </div>
        </div>
        <nav className="navGroups">
          <div>
            <small>Operations</small>
            {[["control", "Control room"], ["process", "PI Vision-style"]].map(([id, label]) => (
              <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id as Screen)}>{label}</button>
            ))}
          </div>
          <div className="backendNav">
            <small>Backend / super users</small>
            {[["ontology", "Ontology browser"], ["fabric", "Fabric model"]].map(([id, label]) => (
              <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id as Screen)}>{label}</button>
            ))}
          </div>
        </nav>
        <div className="live"><span /> LIVE {new Date().toLocaleTimeString()}</div>
      </header>

      <DemoGuide step={demoStep} setStep={setDemoStep} presentationMode={presentationMode} autoAdvance={autoAdvance} setAutoAdvance={setAutoAdvance} resetDemo={resetDemo} />

      {isOperationsScreen && (
        <section className="scenarioBar">
          <div>
            <strong>{scenarios[scenario].name}</strong>
            <p>{scenarios[scenario].description}</p>
          </div>
          <div className="scenarioButtons">
            {(Object.keys(scenarios) as ScenarioId[]).map((id) => (
              <button key={id} className={scenario === id ? "active" : ""} onClick={() => setScenario(id)}>{scenarios[id].name}</button>
            ))}
            <button onClick={resetDemo}>Reset</button>
            <button className={presentationMode ? "active" : ""} onClick={togglePresentationMode}>{presentationMode ? "Exit presentation" : "Presentation mode"}</button>
          </div>
        </section>
      )}

      <main>
        <div className="contentWithCopilot">
          <div className="primaryContent">
            {screen === "control" && <ControlRoom tags={tags} scenario={scenario} />}
            {screen === "process" && <ProcessMimic tags={tags} />}
            {screen === "ontology" && <OntologyBrowser selected={selectedAsset} onSelect={setSelectedAsset} />}
            {screen === "fabric" && <FabricView />}
          </div>
          <CopilotPanel screen={screen} scenario={scenario} selectedAsset={selectedAsset} tags={tags} />
        </div>
      </main>
    </div>
  );
}
