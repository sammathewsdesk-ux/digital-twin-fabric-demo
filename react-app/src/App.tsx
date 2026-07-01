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

type Screen = "landing" | "control" | "incident" | "digitalTwin" | "process" | "piCompression" | "piSeparation" | "piRefinery" | "piTrends" | "ontology" | "fabric";
type ThemeMode = "light" | "dark";
type Persona = "operator" | "reliability" | "production" | "architect";

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

const copilotKnowledge = [
  {
    id: "asset-k101",
    title: "Gas Compressor K101",
    terms: ["k101", "compressor", "gas export", "vibration", "bearing", "compression"],
    content: "Gas Compressor K101 is a rotating equipment asset in Gas Processing. It has telemetry for vibration, bearing temperature and discharge pressure. It contributes to CompressionEfficiency, GasExportReliability and ProductionThroughput. The main failure mode in the demo is compressor bearing degradation."
  },
  {
    id: "asset-v101",
    title: "Inlet Separator V101",
    terms: ["v101", "separator", "separation", "level", "carryover", "slugging"],
    content: "Inlet Separator V101 receives produced fluids from Production Well W01. Its pressure and level telemetry indicate separation stability. Level instability can create liquid carryover risk and downstream gas compression upset."
  },
  {
    id: "asset-h101-c101",
    title: "Refinery CDU H101 and C101",
    terms: ["h101", "c101", "heater", "column", "refinery", "cdu", "fuel", "differential pressure", "energy"],
    content: "Fired Heater H101 and Atmospheric Column C101 represent the refinery crude unit. H101 fuel flow and outlet temperature combine with C101 top temperature and differential pressure to indicate energy intensity, emissions intensity and refinery utilization risk."
  },
  {
    id: "ontology",
    title: "Ontology and digital spine",
    terms: ["ontology", "semantic", "relationship", "digital spine", "asset hierarchy", "graph"],
    content: "The ontology defines asset classes, instances and relationships such as contains, flowsTo, hasTelemetry, hasFailureMode and hasKPI. This lets the demo trace from a raw PI-style tag to an asset, process unit, failure mode, KPI and recommended action."
  },
  {
    id: "fabric",
    title: "Fabric implementation",
    terms: ["fabric", "eventstream", "eventhouse", "lakehouse", "semantic model", "direct lake", "power bi"],
    content: "The Fabric architecture maps synthetic PI replay to Eventstream and Eventhouse for hot telemetry, Lakehouse tables for ontology and history, and a Direct Lake/Power BI semantic model for KPIs, health, reliability and business impact."
  },
  {
    id: "kpis",
    title: "KPI and health layer",
    terms: ["kpi", "health", "availability", "reliability", "throughput", "emissions", "business impact"],
    content: "The KPI layer includes asset health, production throughput, gas export reliability, compression efficiency, separator stability, refinery utilization, energy intensity and emissions intensity. These KPIs are derived from telemetry and semantic asset context."
  }
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

function ControlRoom({ tags, scenario, presentationMode }: { tags: TagState[]; scenario: ScenarioId; presentationMode: boolean }) {
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
      <ValueOverlay throughput={throughput} gasReliability={gasReliability} constraintRisk={constraintRisk} />

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

      {presentationMode && (
        <article className="card side">
          <div className="cardHeader"><span>Demo talk track</span></div>
          <div className="talkTrack">
            <strong>Message to customer</strong>
            <p>Fabric is not just storing time-series data; the ontology turns raw tags into asset, process, reliability, and business context.</p>
            <p>That means the same live signal can drive operator action, reliability prioritization, and executive KPI impact.</p>
          </div>
        </article>
      )}
    </section>
  );
}

function ExecutiveLanding({
  setScreen,
  setScenario,
  setPresentationMode,
  highlightDigitalTwin
}: {
  setScreen: (screen: Screen) => void;
  setScenario: (scenario: ScenarioId) => void;
  setPresentationMode: (enabled: boolean) => void;
  highlightDigitalTwin: boolean;
}) {
  return (
    <section className="landing">
      <article className="card landingHero">
        <div>
          <small>Executive summary</small>
          <h2>Fabric-powered Digital Twin for intelligent energy operations</h2>
          <p>This showcase demonstrates how Microsoft Fabric can become the semantic intelligence layer for industrial operations: connecting live OT telemetry, asset hierarchy, events, failure modes and business KPIs into one explainable operational twin.</p>
          <div className="execSummaryGrid">
            <div><strong>What it is</strong><span>An ontology-led Digital Twin spanning offshore production and refinery operations.</span></div>
            <div><strong>What it proves</strong><span>Fabric can turn fragmented PI-style tags and enterprise data into trusted asset intelligence.</span></div>
            <div><strong>Why it matters</strong><span>Leaders can see operational risk, business impact and recommended action in the same experience.</span></div>
          </div>
        </div>
        <div className="landingActions">
          <button className="guidedIncidentAction" onClick={() => { setPresentationMode(true); setScenario("compressor"); setScreen("incident"); }}>Start guided incident</button>
          <button className={highlightDigitalTwin ? "tourHighlight" : ""} onClick={() => setScreen("digitalTwin")}>Open Digital Twin</button>
          <button onClick={() => setScreen("fabric")}>Show Fabric proof</button>
        </div>
      </article>
      <article className="card execTakeaways">
        <div className="cardHeader"><span>Leadership takeaways</span><small>What to look for in the demo</small></div>
        <div className="takeawayGrid">
          <div><strong>1. Digital spine</strong><p>A semantic asset model links wells, equipment, telemetry, events and KPIs.</p></div>
          <div><strong>2. Live digital thread</strong><p>PI-style telemetry replay creates realistic operational behaviour, not static dashboard data.</p></div>
          <div><strong>3. Explainable decisions</strong><p>Every alert can be traced from tag to asset, failure mode, KPI impact and action.</p></div>
          <div><strong>4. Fabric proof</strong><p>The experience maps directly to Eventstream, Eventhouse, Lakehouse and semantic model patterns.</p></div>
        </div>
      </article>
      <div className="landingGrid">
        <ProofCard title="Digital spine" metric="39" unit="assets" text="Anonymized hierarchy spanning subsurface, wells, offshore production and refinery operations." />
        <ProofCard title="Live digital thread" metric="97k" unit="rows" text="Loopable PI-style telemetry with re-stamped live replay and scenario behaviour." />
        <ProofCard title="Semantic intelligence" metric="85" unit="edges" text="Relationships connect tags, assets, process flow, failure modes, KPIs and actions." />
        <ProofCard title="Fabric-ready" metric="12" unit="tables" text="Lakehouse/Warehouse schema, Eventhouse hot path and semantic model measures." />
      </div>
    </section>
  );
}

function ProofCard({ title, metric, unit, text }: { title: string; metric: string; unit: string; text: string }) {
  return (
    <article className="card proofCard">
      <div className="metricValue">{metric}<span>{unit}</span></div>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ValueOverlay({ throughput, gasReliability, constraintRisk }: { throughput: number; gasReliability: number; constraintRisk: number }) {
  const deferredProduction = Math.max(0, 100 - gasReliability) * 42;
  const energyCost = Math.max(0, 75 - constraintRisk) * 1800;
  const maintenancePriority = gasReliability < 82 || constraintRisk < 70 ? "High" : "Medium";
  return (
    <article className="card valueOverlay">
      <div className="cardHeader"><span>Customer value overlay</span><small>Business impact estimate</small></div>
      <div className="valueGrid">
        <div><strong>{format(deferredProduction, 0)}</strong><span>boe/d at risk</span></div>
        <div><strong>{format(energyCost, 0)}</strong><span>synthetic energy cost exposure</span></div>
        <div><strong>{maintenancePriority}</strong><span>maintenance priority</span></div>
        <div><strong>{format(throughput, 0)}</strong><span>current production throughput</span></div>
      </div>
    </article>
  );
}

function IncidentJourney({ tags, setScreen }: { tags: TagState[]; setScreen: (screen: Screen) => void }) {
  const byTag = tagMap(tags);
  const steps = [
    ["Early signal", "K101 vibration begins trending above normal baseline.", `${format(byTag["TAG-OPH-A-K101-VIB-PV"].value, 1)} mm/s`],
    ["Event frame", "High vibration event is created and linked to compressor K101.", "EVT-OPH-A-K101-VIB-001"],
    ["Failure mode", "Ontology maps the event to compressor bearing degradation.", "FM-COMP-001"],
    ["KPI impact", "Gas export reliability and compression efficiency are reduced.", "Reliability watch"],
    ["Recommended action", "Inspect bearing/lube oil condition and consider load reduction.", "Shift handover"]
  ];
  return (
    <section className="incidentJourney">
      <article className="card incidentHero">
        <div className="cardHeader"><span>True incident journey</span><small>Signal to action</small></div>
        <div className="journeySteps">
          {steps.map(([title, detail, value], index) => (
            <div className="journeyStep" key={title}>
              <i>{index + 1}</i>
              <strong>{title}</strong>
              <p>{detail}</p>
              <span className="mono">{value}</span>
            </div>
          ))}
        </div>
      </article>
      <article className="card">
        <div className="cardHeader"><span>Trace path</span><small>Ontology-driven explainability</small></div>
        <div className="impactGraph large">
          {["TAG-OPH-A-K101-VIB-PV", "Gas Compressor K101", "Bearing degradation", "Gas export reliability", "Inspect bearing/lube oil"].map((node, index) => (
            <div key={node} className="impactNode">
              <strong>{node}</strong>
              {index < 4 && <span>flows to</span>}
            </div>
          ))}
        </div>
        <div className="twinActions">
          <button onClick={() => setScreen("piCompression")}>Open compressor PI analysis</button>
          <button onClick={() => setScreen("ontology")}>Open ontology impact graph</button>
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

function PICompressionScreen({ tags }: { tags: TagState[] }) {
  const byTag = tagMap(tags);
  return (
    <section className="piDashboard">
      <PIHeader title="Gas Compression Train K101" subtitle="Driver, compressor, lube oil, vibration, discharge pressure and reliability context" />
      <div className="piGrid">
        <article className="card piMimicCard">
          <div className="cardHeader"><span>K101 compressor train mimic</span><small>Live PI analysis</small></div>
          <div className="miniMimic compression">
            <Pipe x={70} y={150} w={210} variant="normal" />
            <Pipe x={280} y={150} w={230} variant="watch" />
            <Pipe x={510} y={150} w={210} variant="normal" />
            <Unit kind="vessel" x={70} y={126} label="SUCTION SCRUBBER" />
            <Unit kind="compressor" x={300} y={124} label="K101 COMPRESSOR" />
            <Unit kind="compressor" x={430} y={124} label="M101 DRIVER" />
            <Unit kind="vessel" x={640} y={126} label="EXPORT METER" />
            <TagBox x={250} y={58} tag={byTag["TAG-OPH-A-K101-VIB-PV"]} />
            <TagBox x={360} y={206} tag={byTag["TAG-OPH-A-K101-TEMP-PV"]} />
            <TagBox x={520} y={58} tag={byTag["TAG-OPH-A-K101-DP-PV"]} />
            <TagBox x={430} y={206} tag={byTag["TAG-OPH-A-M101-POWER-PV"]} />
          </div>
        </article>
        <PIStatusPanel title="Compressor operating envelope" rows={[
          ["Vibration velocity", byTag["TAG-OPH-A-K101-VIB-PV"], "Watch", "Bearing or alignment degradation indicator"],
          ["Bearing temperature", byTag["TAG-OPH-A-K101-TEMP-PV"], "Watch", "Correlates with vibration and lube oil risk"],
          ["Discharge pressure", byTag["TAG-OPH-A-K101-DP-PV"], "Normal", "Export pressure delivery"],
          ["Driver power", byTag["TAG-OPH-A-M101-POWER-PV"], "Normal", "Load and energy intensity proxy"]
        ]} />
      </div>
      <PIAnalysisFooter insight="Semantic insight: K101 is linked through hasTelemetry and hasKPI relationships to CompressionEfficiency, GasExportReliability, and ProductionThroughput." />
    </section>
  );
}

function PISeparationScreen({ tags }: { tags: TagState[] }) {
  const byTag = tagMap(tags);
  return (
    <section className="piDashboard">
      <PIHeader title="Inlet Separation and Wellstream Handling" subtitle="Production well, choke, inlet separator pressure/level and carryover risk" />
      <div className="piGrid">
        <article className="card piMimicCard">
          <div className="cardHeader"><span>Wellstream to separator mimic</span><small>Slugging and control stability</small></div>
          <div className="miniMimic separation">
            <Pipe x={65} y={150} w={230} variant="normal" />
            <Pipe x={295} y={150} w={230} variant="watch" />
            <Pipe x={525} y={115} w={170} variant="normal" />
            <Pipe x={525} y={185} w={170} variant="normal" />
            <Unit kind="vessel" x={65} y={126} label="W01 WELLHEAD" />
            <Unit kind="pump" x={205} y={132} label="CHOKE" />
            <Unit kind="vessel" x={390} y={126} label="V101 INLET SEP" />
            <Unit kind="compressor" x={650} y={92} label="GAS OUT" />
            <Unit kind="pump" x={650} y={168} label="LIQUID OUT" />
            <TagBox x={75} y={60} tag={byTag["TAG-OPH-A-W01-THP-PV"]} />
            <TagBox x={190} y={205} tag={byTag["TAG-OPH-A-W01-CHOKE-POS"]} />
            <TagBox x={320} y={60} tag={byTag["TAG-OPH-A-V101-PRESS-PV"]} />
            <TagBox x={450} y={205} tag={byTag["TAG-OPH-A-V101-LEVEL-PV"]} />
            <TagBox x={520} y={60} tag={byTag["TAG-OPH-A-W01-FLOW-PV"]} />
          </div>
        </article>
        <PIStatusPanel title="Separator control indicators" rows={[
          ["Wellhead pressure", byTag["TAG-OPH-A-W01-THP-PV"], "Normal", "Reservoir-to-surface drawdown context"],
          ["Choke position", byTag["TAG-OPH-A-W01-CHOKE-POS"], "Normal", "Primary production control point"],
          ["Separator pressure", byTag["TAG-OPH-A-V101-PRESS-PV"], "Normal", "Gas/liquid separation pressure envelope"],
          ["Separator level", byTag["TAG-OPH-A-V101-LEVEL-PV"], "Watch", "Carryover and downstream upset indicator"]
        ]} />
      </div>
      <PIAnalysisFooter insight="Semantic insight: V101 level instability is not just a tag excursion; it maps to carryover risk, gas compression stability, and production throughput." />
    </section>
  );
}

function PIRefineryScreen({ tags }: { tags: TagState[] }) {
  const byTag = tagMap(tags);
  return (
    <section className="piDashboard">
      <PIHeader title="Refinery Crude Unit and Heater Performance" subtitle="Crude charge, fired heater outlet, atmospheric column and energy intensity context" />
      <div className="piGrid">
        <article className="card piMimicCard">
          <div className="cardHeader"><span>CDU H101 / C101 process mimic</span><small>Primary processing analysis</small></div>
          <div className="miniMimic refinery">
            <Pipe x={70} y={170} w={200} variant="normal" />
            <Pipe x={270} y={170} w={220} variant="watch" />
            <Pipe x={490} y={170} w={220} variant="alarm" />
            <Unit kind="tank" x={70} y={120} label="T101 CRUDE" />
            <Unit kind="pump" x={220} y={152} label="P101 CHARGE" />
            <Unit kind="heater" x={420} y={138} label="H101 HEATER" />
            <Unit kind="column" x={650} y={76} label="C101 ATM COLUMN" />
            <TagBox x={60} y={50} tag={byTag["TAG-ORC-B-T101-LEVEL-PV"]} />
            <TagBox x={210} y={220} tag={byTag["TAG-ORC-B-P101-FLOW-PV"]} />
            <TagBox x={390} y={62} tag={byTag["TAG-ORC-B-H101-FUEL-PV"]} />
            <TagBox x={480} y={220} tag={byTag["TAG-ORC-B-H101-TEMP-PV"]} />
            <TagBox x={650} y={40} tag={byTag["TAG-ORC-B-C101-DP-PV"]} />
            <TagBox x={720} y={230} tag={byTag["TAG-ORC-B-C101-TOP-TEMP"]} />
          </div>
        </article>
        <PIStatusPanel title="CDU performance indicators" rows={[
          ["Crude charge flow", byTag["TAG-ORC-B-P101-FLOW-PV"], "Normal", "Refinery utilization proxy"],
          ["Fired heater fuel", byTag["TAG-ORC-B-H101-FUEL-PV"], "Watch", "Energy intensity and combustion efficiency"],
          ["Heater outlet temp", byTag["TAG-ORC-B-H101-TEMP-PV"], "Normal", "Thermal delivery to column"],
          ["Column differential pressure", byTag["TAG-ORC-B-C101-DP-PV"], "Degraded", "Flooding, fouling or hydraulic constraint indicator"]
        ]} />
      </div>
      <PIAnalysisFooter insight="Semantic insight: H101 fuel drift and C101 differential pressure combine into an energy intensity and utilization story, not just isolated refinery tags." />
    </section>
  );
}

function PITrendsScreen({ tags }: { tags: TagState[] }) {
  const selected = [
    "TAG-OPH-A-K101-VIB-PV",
    "TAG-OPH-A-V101-LEVEL-PV",
    "TAG-ORC-B-H101-FUEL-PV",
    "TAG-ORC-B-C101-DP-PV"
  ];
  const byTag = tagMap(tags);
  return (
    <section className="piDashboard">
      <PIHeader title="PI Vision Trend and Diagnostics" subtitle="Multi-asset tag trends, alarm bands, scenario comparison and operator diagnostics" />
      <div className="trendGrid">
        {selected.map((tagId, index) => <TrendCard key={tagId} tag={byTag[tagId]} index={index} />)}
      </div>
      <article className="card">
        <div className="cardHeader"><span>Cross-asset diagnostic correlation</span><small>Ontology-aware PI trend interpretation</small></div>
        <div className="correlationGrid">
          <div><strong>K101 vibration + bearing temperature</strong><p>Likely compressor bearing degradation; impacts gas export reliability.</p></div>
          <div><strong>V101 level + pressure oscillation</strong><p>Possible inlet slugging or level loop instability; impacts separation quality.</p></div>
          <div><strong>H101 fuel + C101 differential pressure</strong><p>Potential heater fouling or column hydraulic constraint; impacts energy intensity.</p></div>
        </div>
      </article>
    </section>
  );
}

function PIHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="visionBar piHeader">
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  );
}

function PIStatusPanel({ title, rows }: { title: string; rows: [string, TagState, Status, string][] }) {
  return (
    <article className="card piStatusPanel">
      <div className="cardHeader"><span>{title}</span><small>Tag detail</small></div>
      <table>
        <thead><tr><th>Signal</th><th>Value</th><th>Status</th><th>Interpretation</th></tr></thead>
        <tbody>
          {rows.map(([label, tag, status, interpretation]) => (
            <tr key={tag.tagId} className={statusClass(status)}>
              <td><strong>{label}</strong><br /><small>{tag.tagId}</small></td>
              <td className="mono">{format(tag.value, tag.precision)} {tag.unit}</td>
              <td><StatusPill status={status} /></td>
              <td>{interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function PIAnalysisFooter({ insight }: { insight: string }) {
  return (
    <article className="card piFooter">
      <div className="cardHeader"><span>Analysis note</span><small>PI Vision + ontology</small></div>
      <p>{insight}</p>
    </article>
  );
}

function TrendCard({ tag, index }: { tag: TagState; index: number }) {
  const points = Array.from({ length: 18 }, (_, i) => {
    const wave = Math.sin(i / 2 + index) * 18 + Math.cos(i / 3 + index) * 8;
    const base = 48 + wave + (tag.value > tag.normalMax ? 18 : 0);
    return Math.max(8, Math.min(92, base));
  });
  const status = tag.value > tag.normalMax || tag.value < tag.normalMin ? "Degraded" : tag.value > tag.normalMax * 0.9 ? "Watch" : "Normal";
  return (
    <article className={`card trendCard ${statusClass(status)}`}>
      <div className="cardHeader"><span>{tag.label}</span><StatusPill status={status as Status} /></div>
      <div className="trendValue mono">{format(tag.value, tag.precision)} {tag.unit}</div>
      <div className="trendPlot">
        {points.map((point, i) => <i key={i} style={{ height: `${point}%` }} />)}
      </div>
      <p>{tag.tagId}</p>
    </article>
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
        <h3>Ontology impact graph</h3>
        <div className="impactGraph">
          {[tags[0]?.tagId ?? "Telemetry tag", selectedAsset.name, selectedAsset.id.includes("K101") ? "Bearing degradation" : selectedAsset.id.includes("C101") ? "Column constraint" : "Asset condition", selectedAsset.id.includes("C101") ? "Energy intensity" : "Asset health", "Recommended action"].map((node, index) => (
            <div key={`${node}-${index}`} className="impactNode">
              <strong>{node}</strong>
              {index < 4 && <span>drives</span>}
            </div>
          ))}
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
      <article className="card backendHero">
        <div className="cardHeader"><span>Fabric proof mode</span><small>Screen-to-table lineage</small></div>
        <div className="proofMatrix">
          {[
            ["Control room", "FactAssetHealth, FactKPITimeSeries, BridgeEventImpact"],
            ["Digital Twin mode", "DimAsset, DimAssetClass, BridgeAssetRelationship"],
            ["PI Vision analysis", "FactTelemetryHot, DimTelemetryTag, FactEventFrame"],
            ["Incident journey", "FactEventFrame, DimFailureMode, DimKPI"],
            ["Copilot insights", "Ontology, telemetry, KPI and Fabric context"]
          ].map(([name, tables]) => <div key={name}><strong>{name}</strong><span>{tables}</span></div>)}
        </div>
      </article>
    </section>
  );
}

function DigitalTwinMode({
  selectedAsset,
  setSelectedAsset,
  setScreen,
  tags
}: {
  selectedAsset: string;
  setSelectedAsset: (assetId: string) => void;
  setScreen: (screen: Screen) => void;
  tags: TagState[];
}) {
  const byTag = tagMap(tags);
  const twinAssets = [
    { id: "OPH-A-W01", label: "Well W01", className: "well", x: 10, y: 58, z: 0, value: `${format(byTag["TAG-OPH-A-W01-FLOW-PV"].value, 0)} boe/d` },
    { id: "OPH-A-V101", label: "Inlet Separator V101", className: "separator", x: 30, y: 42, z: 1, value: `${format(byTag["TAG-OPH-A-V101-LEVEL-PV"].value, 1)}% level` },
    { id: "OPH-A-K101", label: "Gas Compressor K101", className: "compressor3d", x: 54, y: 31, z: 2, value: `${format(byTag["TAG-OPH-A-K101-VIB-PV"].value, 1)} mm/s vib` },
    { id: "ORC-B-H101", label: "Fired Heater H101", className: "heater3d", x: 69, y: 58, z: 3, value: `${format(byTag["TAG-ORC-B-H101-FUEL-PV"].value, 0)} kg/h fuel` },
    { id: "ORC-B-C101", label: "Atmospheric Column C101", className: "column3d", x: 84, y: 35, z: 4, value: `${format(byTag["TAG-ORC-B-C101-DP-PV"].value, 1)} kPa DP` }
  ];
  const selected = twinAssets.find((asset) => asset.id === selectedAsset) ?? twinAssets[2];
  const selectedHealth = assetHealth.find((asset) => asset.assetId === selected.id);

  return (
    <section className="digitalTwinMode">
      <article className="card twinHero">
        <div className="cardHeader">
          <span>Digital Twin Mode</span>
          <small>Clickable 3D-style asset model</small>
        </div>
        <div className="twinScene">
          <div className="twinDeck" />
          <div className="twinPipeline one" />
          <div className="twinPipeline two" />
          <div className="twinPipeline three" />
          {twinAssets.map((asset) => (
            <button
              key={asset.id}
              className={`twinAsset ${asset.className} ${selected.id === asset.id ? "selected" : ""}`}
              style={{ left: `${asset.x}%`, top: `${asset.y}%`, ["--z" as string]: asset.z }}
              onClick={() => setSelectedAsset(asset.id)}
            >
              <strong>{asset.label}</strong>
              <span>{asset.value}</span>
            </button>
          ))}
        </div>
      </article>
      <article className="card twinDetail">
        <div className="cardHeader"><span>{selected.label}</span><small>{selected.id}</small></div>
        <div className="twinDetailBody">
          <div className="metricValue">{selectedHealth?.score ?? 82}<span>/100 health</span></div>
          <p>{assetHealth.find((asset) => asset.assetId === selected.id)?.diagnostic ?? "Asset is connected into the digital twin relationship graph and live telemetry model."}</p>
          <div className="twinActions">
            <button onClick={() => setScreen("ontology")}>Open ontology context</button>
            <button onClick={() => setScreen(selected.id.startsWith("ORC") ? "piRefinery" : selected.id.includes("K101") ? "piCompression" : "process")}>Open PI analysis</button>
          </div>
          <div className="chips">
            {relationships.filter((edge) => edge.source === selected.id || edge.target === selected.id).slice(0, 5).map((edge) => (
              <span key={`${edge.source}-${edge.type}-${edge.target}`}>{edge.source} {edge.type} {edge.target}</span>
            ))}
          </div>
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
  tags,
  setScreen,
  setScenario,
  setSelectedAsset,
  highlight
}: {
  screen: Screen;
  scenario: ScenarioId;
  selectedAsset: string;
  tags: TagState[];
  setScreen: (screen: Screen) => void;
  setScenario: (scenario: ScenarioId) => void;
  setSelectedAsset: (assetId: string) => void;
  highlight: boolean;
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me anything about the demo data. I can reason over assets, tags, KPIs, events, failure modes, relationships and the Fabric architecture."
    }
  ]);
  const [question, setQuestion] = useState("");
  const prompts = copilotPrompts(screen);

  function answerFor(prompt: string) {
    const byTag = tagMap(tags);
    const vib = byTag["TAG-OPH-A-K101-VIB-PV"].value;
    const dp = byTag["TAG-ORC-B-C101-DP-PV"].value;
    const sepLevel = byTag["TAG-OPH-A-V101-LEVEL-PV"].value;
    const heaterFuel = byTag["TAG-ORC-B-H101-FUEL-PV"].value;
    const selected = assets.find((asset) => asset.id === selectedAsset);
    const normalized = prompt.toLowerCase();
    const facts = retrieveFacts(normalized);
    const factText = facts.map((fact) => `- ${fact.title}: ${fact.content}`).join("\n");
    const liveContext = `Live context: scenario=${scenarios[scenario].name}; screen=${screenLabel(screen)}; K101 vibration=${format(vib, 1)} mm/s; V101 level=${format(sepLevel, 1)}%; H101 fuel=${format(heaterFuel, 0)} kg/h; C101 DP=${format(dp, 1)} kPa.`;

    if (normalized.includes("risk") || normalized.includes("attention")) {
      return `${liveContext}\n\nHighest current risk: ${scenario === "refinery" ? "refinery CDU constraint. C101 differential pressure and H101 fuel demand indicate energy intensity and utilization risk." : scenario === "separator" ? "inlet separation instability. V101 level should be watched for carryover risk." : "gas compressor K101. Vibration maps to gas export reliability through the ontology."}\n\nRecommended action: use the ontology trace to move from tag -> asset -> failure mode -> KPI impact -> operating action.\n\nRelevant retrieved context:\n${factText}`;
    } else if (normalized.includes("relationship") || normalized.includes("ontology")) {
      return `${selected?.name ?? "The selected asset"} sits in the digital spine as ${selected?.classId ?? "an asset"}.\n\nThe model links tags to assets via hasTelemetry, assets to process context via contains/flowsTo, and assets to business outcomes via hasKPI. That is what turns raw PI-style points into explainable operational impact.\n\nRetrieved context:\n${factText}`;
    } else if (normalized.includes("fabric")) {
      return `Fabric path: Eventstream ingests the live PI-style replay; Eventhouse serves hot telemetry; Lakehouse stores the ontology, relationship graph, telemetry history, events, health and KPI facts; Direct Lake/Power BI exposes measures; the React app consumes the semantic context.\n\nRetrieved context:\n${factText}`;
    } else if (normalized.includes("customer") || normalized.includes("tell")) {
      return `Customer storyline: start with fragmented OT and IT data, introduce the ontology as the digital spine, show live telemetry as the digital thread, then demonstrate how Fabric converts an abnormal tag into asset health, KPI impact, and recommended action.\n\nUse this sequence: Control Room Operations -> PI Vision analysis -> Copilot explanation -> Backend/Super-user view if asked.`;
    } else if (normalized.includes("abnormal") || normalized.includes("tag")) {
      return `${liveContext}\n\nCurrent abnormal indicators depend on scenario. Compressor degradation is visible through K101 vibration and bearing temperature. Separator instability is visible through V101 level/pressure. Refinery drift is visible through H101 fuel and C101 differential pressure.\n\nRetrieved context:\n${factText}`;
    } else if (normalized.includes("kpi") || normalized.includes("impact")) {
      return `KPI impact is inferred through the semantic model: compressor degradation affects compression efficiency and gas export reliability; separator instability affects production throughput and downstream stability; CDU drift affects energy intensity, emissions intensity and refinery utilization.\n\nRetrieved context:\n${factText}`;
    } else {
      return `${liveContext}\n\nI found the most relevant demo context below and used it to answer your question:\n${factText}\n\nAnswer: the key point is that telemetry, asset hierarchy, events and KPI semantics are linked, so a user can move from live tag behaviour to cause, impact and action in one workflow.`;
    }
  }

  function retrieveFacts(normalizedPrompt: string) {
    const scored = copilotKnowledge.map((fact) => {
      const score = fact.terms.reduce((total, term) => total + (normalizedPrompt.includes(term) ? 1 : 0), 0);
      return { ...fact, score };
    }).sort((a, b) => b.score - a.score);
    const matched = scored.filter((fact) => fact.score > 0).slice(0, 3);
    return matched.length ? matched : scored.slice(0, 3);
  }

  function ask(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const commandResponse = runCommand(trimmed.toLowerCase());
    const response = answerFor(trimmed);
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: commandResponse ? `${commandResponse}\n\n${response}` : response }
    ].slice(-6));
    setQuestion("");
  }

  function runCommand(normalized: string) {
    if (!(normalized.includes("open") || normalized.includes("show") || normalized.includes("navigate") || normalized.includes("take me"))) return "";
    if (normalized.includes("compressor") || normalized.includes("k101")) {
      setSelectedAsset("OPH-A-K101");
      setScenario("compressor");
      setScreen("piCompression");
      return "Command executed: opened Gas Compression PI analysis and selected K101.";
    }
    if (normalized.includes("refinery") || normalized.includes("cdu") || normalized.includes("heater")) {
      setSelectedAsset("ORC-B-H101");
      setScenario("refinery");
      setScreen("piRefinery");
      return "Command executed: opened Refinery CDU analysis.";
    }
    if (normalized.includes("twin")) {
      setScreen("digitalTwin");
      return "Command executed: opened Digital Twin mode.";
    }
    if (normalized.includes("incident")) {
      setScenario("compressor");
      setScreen("incident");
      return "Command executed: opened the incident journey.";
    }
    if (normalized.includes("fabric")) {
      setScreen("fabric");
      return "Command executed: opened Fabric proof mode.";
    }
    return "";
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        text: "New Copilot session started. Ask me about assets, PI tags, events, KPIs, ontology relationships, failure modes or Fabric architecture."
      }
    ]);
    setQuestion("");
  }

  return (
    <aside className={`copilotPanel ${highlight ? "tourHighlight" : ""}`}>
      <div className="cardHeader">
        <span>Copilot insights</span>
        <button className="copilotReset" onClick={resetChat}>Reset</button>
      </div>
      <div className="copilotBody">
        <div className="promptGrid">
          {prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}
        </div>
        <div className="copilotChat" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chatMessage ${message.role}`}>
              <strong>{message.role === "assistant" ? "Copilot" : "You"}</strong>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); ask(question); }}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about risk, ontology, Fabric, or customer story..." />
          <button type="submit">Send</button>
        </form>
      </div>
    </aside>
  );
}

function copilotPrompts(screen: Screen) {
  if (screen === "landing") return ["Start customer story", "Show compressor risk", "Explain the value"];
  if (screen === "control") return ["What needs attention?", "Tell me the customer story", "What is the business impact?"];
  if (screen === "digitalTwin") return ["Open compressor risk", "Explain this asset", "Show ontology impact"];
  if (screen === "incident") return ["Trace this incident", "What is the KPI impact?", "Open compressor analysis"];
  if (screen === "process" || screen.startsWith("pi")) return ["Explain these tag changes", "What is abnormal?", "Trace this to KPIs"];
  if (screen === "ontology") return ["Explain the relationships", "Why does ontology matter?", "Show impact path"];
  return ["Explain Fabric architecture", "How does real-time flow work?", "What tables power this?"];
}

function screenLabel(screen: Screen) {
  const labels: Record<Screen, string> = {
    landing: "Executive / Landing",
    control: "Control Room Operations / Control room",
    incident: "Control Room Operations / Incident journey",
    digitalTwin: "Control Room Operations / Digital Twin mode",
    process: "PI Vision analysis / Overview",
    piCompression: "PI Vision analysis / Compression",
    piSeparation: "PI Vision analysis / Separation",
    piRefinery: "PI Vision analysis / Refinery CDU",
    piTrends: "PI Vision analysis / Trends",
    ontology: "Backend / Ontology browser",
    fabric: "Backend / Fabric model"
  };
  return labels[screen];
}

function ScreenNavigation({
  screen,
  setScreen,
  presentationMode,
  highlight
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  presentationMode: boolean;
  highlight: boolean;
}) {
  const options = [
    { group: "Executive", items: [["landing", "Executive landing"]], backend: false },
    { group: "Control Room Operations", items: [["control", "Control room"], ["incident", "Incident journey"], ["digitalTwin", "Digital Twin mode"]], backend: false },
    {
      group: "PI Vision analysis",
      items: [
        ["process", "Process overview"],
        ["piCompression", "Gas compression"],
        ["piSeparation", "Inlet separation"],
        ["piRefinery", "Refinery CDU"],
        ["piTrends", "Trends and diagnostics"]
      ],
      backend: false
    },
    { group: "Backend / super users", items: [["ontology", "Ontology browser"], ["fabric", "Fabric model"]], backend: true }
  ] as const;

  return (
    <label className={`menuSelect ${highlight ? "tourHighlight" : ""}`}>
      <span>Workspace</span>
      <select value={screen} onChange={(event) => setScreen(event.target.value as Screen)}>
        {options.filter((option) => !presentationMode || !option.backend).map((option) => (
          <optgroup key={option.group} label={option.group}>
            {option.items.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </optgroup>
        ))}
      </select>
      <small>{screenLabel(screen)}</small>
    </label>
  );
}

function OnboardingCoach({
  dismiss,
  openDigitalTwin,
  step,
  setStep
}: {
  dismiss: () => void;
  openDigitalTwin: () => void;
  step: number;
  setStep: (step: number) => void;
}) {
  const steps = [
    {
      title: "Workspace",
      text: "Use the Workspace dropdown to move between the executive summary, control room, Digital Twin mode, PI Vision analysis, and backend Fabric proof."
    },
    {
      title: "Persona",
      text: "Use Persona to frame the same operational data for an operator, reliability engineer, production leader, or data architect."
    },
    {
      title: "Open Digital Twin",
      text: "This opens the clickable 3D-style asset model so users can select an asset, inspect health context, and drill into ontology or PI analysis."
    },
    {
      title: "Copilot insights",
      text: "Copilot answers questions and commands across the demo, such as showing compressor risk, explaining Fabric architecture, or tracing KPI impact."
    }
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className={`onboardingOverlay step${step + 1}`} role="dialog" aria-modal="true" aria-label="Demo quick start">
      <div className="onboardingPanel spotlightPanel">
        <div className="onboardingIntro">
          <small>Quick start · {step + 1} of {steps.length}</small>
          <h2>{current.title}</h2>
          <p>{current.text}</p>
        </div>
        <div className="onboardingActions">
          {step > 0 && <button onClick={() => setStep(step - 1)}>Back</button>}
          {!isLast && <button onClick={() => setStep(step + 1)}>Next</button>}
          {isLast && <button onClick={openDigitalTwin}>Open Digital Twin</button>}
          <button onClick={dismiss}>Explore myself</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [scenario, setScenario] = useState<ScenarioId>("normal");
  const [selectedAsset, setSelectedAsset] = useState("OPH-A-K101");
  const [demoStep, setDemoStep] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [persona, setPersona] = useState<Persona>("production");
  const [replaySpeed, setReplaySpeed] = useState("60x");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const tags = useLiveTags(scenario);
  const isOperationsScreen = screen === "control" || screen === "digitalTwin" || screen === "process" || screen.startsWith("pi");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

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

  function openDigitalTwinFromOnboarding() {
    setShowOnboarding(false);
    setPresentationMode(false);
    setScenario("normal");
    setSelectedAsset("OPH-A-K101");
    setScreen("digitalTwin");
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
          <ScreenNavigation screen={screen} setScreen={setScreen} presentationMode={presentationMode} highlight={showOnboarding && onboardingStep === 0} />
        </nav>
        <div className="topActions">
          <label className="themeSwitch">
            <span>Theme</span>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className={`themeSwitch ${showOnboarding && onboardingStep === 1 ? "tourHighlight" : ""}`}>
            <span>Persona</span>
            <select value={persona} onChange={(event) => setPersona(event.target.value as Persona)}>
              <option value="operator">Operator</option>
              <option value="reliability">Reliability</option>
              <option value="production">Production</option>
              <option value="architect">Data architect</option>
            </select>
          </label>
          <button className={`presentationToggle ${presentationMode ? "active" : ""}`} onClick={togglePresentationMode}>
            <span>{presentationMode ? "Presenting" : "Present"}</span>
            <small>{presentationMode ? "Customer mode on" : "Customer mode"}</small>
          </button>
          <div className="live"><span /> LIVE {new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      {presentationMode && <DemoGuide step={demoStep} setStep={setDemoStep} presentationMode={presentationMode} autoAdvance={autoAdvance} setAutoAdvance={setAutoAdvance} resetDemo={resetDemo} />}
      {showOnboarding && <OnboardingCoach dismiss={() => setShowOnboarding(false)} openDigitalTwin={openDigitalTwinFromOnboarding} step={onboardingStep} setStep={setOnboardingStep} />}

      {isOperationsScreen && (
        <section className="scenarioBar">
          <div>
            <strong>Scenario: {scenarios[scenario].name}</strong>
            <p>{scenarios[scenario].description} Active persona: {persona}. Replay speed: {replaySpeed}.</p>
          </div>
          <div className="scenarioButtons">
            <label className="menuSelect compact">
              <span>Operating scenario</span>
              <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioId)}>
                {(Object.keys(scenarios) as ScenarioId[]).map((id) => <option key={id} value={id}>{scenarios[id].name}</option>)}
              </select>
            </label>
            <label className="menuSelect compact">
              <span>Replay speed</span>
              <select value={replaySpeed} onChange={(event) => setReplaySpeed(event.target.value)}>
                <option value="1x">1x live</option>
                <option value="10x">10x</option>
                <option value="60x">60x</option>
                <option value="300x">300x demo</option>
              </select>
            </label>
            <button className="secondaryAction" onClick={resetDemo}>Reset demo</button>
          </div>
        </section>
      )}

      <main>
        <div className="contentWithCopilot">
          <div className="primaryContent">
            {screen === "landing" && <ExecutiveLanding setScreen={setScreen} setScenario={setScenario} setPresentationMode={setPresentationMode} highlightDigitalTwin={showOnboarding && onboardingStep === 2} />}
            {screen === "control" && <ControlRoom tags={tags} scenario={scenario} presentationMode={presentationMode} />}
            {screen === "incident" && <IncidentJourney tags={tags} setScreen={setScreen} />}
            {screen === "digitalTwin" && <DigitalTwinMode selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} setScreen={setScreen} tags={tags} />}
            {screen === "process" && <ProcessMimic tags={tags} />}
            {screen === "piCompression" && <PICompressionScreen tags={tags} />}
            {screen === "piSeparation" && <PISeparationScreen tags={tags} />}
            {screen === "piRefinery" && <PIRefineryScreen tags={tags} />}
            {screen === "piTrends" && <PITrendsScreen tags={tags} />}
            {screen === "ontology" && <OntologyBrowser selected={selectedAsset} onSelect={setSelectedAsset} />}
            {screen === "fabric" && <FabricView />}
          </div>
          <CopilotPanel screen={screen} scenario={scenario} selectedAsset={selectedAsset} tags={tags} setScreen={setScreen} setScenario={setScenario} setSelectedAsset={setSelectedAsset} highlight={showOnboarding && onboardingStep === 3} />
        </div>
      </main>
    </div>
  );
}
