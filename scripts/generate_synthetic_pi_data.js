const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tagCatalog = path.join(root, "telemetry-tag-patterns.csv");
const dataDir = path.join(root, "data");
const telemetryOut = path.join(dataDir, "pi_telemetry_loop.csv");
const eventsOut = path.join(dataDir, "pi_event_frames.csv");
const manifestOut = path.join(dataDir, "pi_replay_manifest.json");

const loopHours = 6;
const loopSeconds = loopHours * 60 * 60;
const startTime = new Date("2026-06-30T08:00:00.000Z");
let seed = 70421;

const scenarios = [
  { id: "normal_operations", start_loop_second: 0, end_loop_second: loopSeconds, description: "Stable operating conditions with normal process noise and daily variation." },
  { id: "compressor_vibration_degradation", start_loop_second: 7200, end_loop_second: 10800, description: "Gradual vibration and bearing temperature increase on offshore gas compressor K101." },
  { id: "separator_level_instability", start_loop_second: 13200, end_loop_second: 15300, description: "Oscillating separator level caused by unstable inlet flow and control response." },
  { id: "refinery_heater_efficiency_drift", start_loop_second: 15600, end_loop_second: loopSeconds, description: "Fired heater fuel use increases while outlet temperature control becomes less efficient." }
];

function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function gaussian() {
  const u = Math.max(random(), 1e-9);
  const v = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, headers, rows) {
  const output = [headers.join(",")];
  for (const row of rows) {
    output.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${output.join("\n")}\n`, "utf8");
}

function activeScenario(loopSecond) {
  return scenarios
    .filter((scenario) => scenario.start_loop_second <= loopSecond && loopSecond < scenario.end_loop_second)
    .map((scenario) => scenario.id)
    .join("|");
}

function wave(loopSecond, periodSeconds, amplitude) {
  return amplitude * Math.sin((2 * Math.PI * loopSecond) / periodSeconds);
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function normalizedWindow(loopSecond, start, end) {
  if (loopSecond < start) return 0;
  if (loopSecond > end) return 1;
  return (loopSecond - start) / (end - start);
}

function valueFor(tag, loopSecond) {
  const low = Number(tag.normal_min);
  const high = Number(tag.normal_max);
  const midpoint = (low + high) / 2;
  const span = high - low;
  const noise = gaussian() * span * 0.025;
  let value = midpoint + wave(loopSecond, 3600, span * 0.06) + wave(loopSecond, 14400, span * 0.04) + noise;
  const id = tag.tag_id;

  if (id.includes("W01-FLOW")) value = midpoint + wave(loopSecond, 5400, span * 0.12) + gaussian() * span * 0.04;
  else if (id.includes("CHOKE")) value = midpoint + wave(loopSecond, 5400, span * 0.10) + gaussian() * span * 0.02;
  else if (id.includes("V101-LEVEL")) value += wave(loopSecond, 300, span * 0.28 * normalizedWindow(loopSecond, 13200, 15300));
  else if (id.includes("V101-PRESS")) value += wave(loopSecond, 450, span * 0.12 * normalizedWindow(loopSecond, 13200, 15300));
  else if (id.includes("K101-VIB")) value = low + span * (0.18 + 0.66 * normalizedWindow(loopSecond, 7200, 10800)) + gaussian() * span * 0.025;
  else if (id.includes("K101-TEMP")) value += span * 0.22 * normalizedWindow(loopSecond, 7200, 10800);
  else if (id.includes("K101-DP")) value -= span * 0.08 * normalizedWindow(loopSecond, 7200, 10800);
  else if (id.includes("M101-POWER")) value += span * 0.10 * normalizedWindow(loopSecond, 7200, 10800);
  else if (id.includes("H101-FUEL")) value += span * 0.18 * normalizedWindow(loopSecond, 15600, loopSeconds);
  else if (id.includes("H101-TEMP")) value -= span * 0.05 * normalizedWindow(loopSecond, 15600, loopSeconds);
  else if (id.includes("C101-DP")) value += span * 0.16 * normalizedWindow(loopSecond, 15600, loopSeconds);

  const precision = Number(tag.sample_interval_seconds) <= 5 ? 3 : 2;
  return Number(clamp(value, low - span * 0.12, high + span * 0.12).toFixed(precision));
}

function qualityFor(tag, value) {
  return value < Number(tag.normal_min) || value > Number(tag.normal_max) ? "Questionable" : "Good";
}

function generateTelemetry(tags) {
  const headers = ["sequence", "event_time", "loop_second", "tag_id", "tag_name", "asset_id", "value", "engineering_unit", "quality", "scenario"];
  const stream = fs.createWriteStream(telemetryOut, { encoding: "utf8" });
  stream.write(`${headers.join(",")}\n`);
  let sequence = 1;

  for (let loopSecond = 0; loopSecond <= loopSeconds; loopSecond += 1) {
    const eventTime = new Date(startTime.getTime() + loopSecond * 1000).toISOString();
    for (const tag of tags) {
      if (loopSecond % Number(tag.sample_interval_seconds) !== 0) continue;
      const value = valueFor(tag, loopSecond);
      const row = {
        sequence,
        event_time: eventTime,
        loop_second: loopSecond,
        tag_id: tag.tag_id,
        tag_name: tag.tag_name,
        asset_id: tag.asset_id,
        value,
        engineering_unit: tag.engineering_unit,
        quality: qualityFor(tag, value),
        scenario: activeScenario(loopSecond)
      };
      stream.write(`${headers.map((header) => csvEscape(row[header])).join(",")}\n`);
      sequence += 1;
    }
  }

  stream.end();
  return sequence - 1;
}

function generateEvents() {
  const rows = [
    ["EVT-OPH-A-K101-VIB-001", "OPH-A-K101", "TAG-OPH-A-K101-VIB-PV", "HighVibration", "High", 9300, 10800, "Compressor vibration rises above normal band during synthetic degradation scenario."],
    ["EVT-OPH-A-K101-TEMP-001", "OPH-A-K101", "TAG-OPH-A-K101-TEMP-PV", "BearingTemperatureDrift", "Medium", 9900, 10800, "Compressor bearing temperature drifts upward alongside vibration."],
    ["EVT-OPH-A-V101-LVL-001", "OPH-A-V101", "TAG-OPH-A-V101-LEVEL-PV", "LevelInstability", "Medium", 13200, 15300, "Inlet separator liquid level oscillates during unstable inlet flow scenario."],
    ["EVT-ORC-B-H101-EFF-001", "ORC-B-H101", "TAG-ORC-B-H101-FUEL-PV", "HeaterEfficiencyDrift", "Medium", 17100, loopSeconds, "Fired heater fuel demand increases without equivalent outlet temperature benefit."],
    ["EVT-ORC-B-C101-DP-001", "ORC-B-C101", "TAG-ORC-B-C101-DP-PV", "ColumnDifferentialPressureDrift", "Low", 18000, loopSeconds, "Atmospheric column differential pressure trends upward during heater efficiency scenario."]
  ].map(([event_id, asset_id, source_tag_id, event_type, severity, start_loop_second, end_loop_second, description]) => ({
    event_id, asset_id, source_tag_id, event_type, severity, start_loop_second, end_loop_second, description
  }));
  writeCsv(eventsOut, Object.keys(rows[0]), rows);
  return rows.length;
}

function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const tags = parseCsv(tagCatalog);
  const rows = generateTelemetry(tags);
  const events = generateEvents();
  const manifest = {
    datasetId: "synthetic-pi-telemetry-loop",
    description: "Loopable synthetic PI-style telemetry for the O&G Digital Twin demo.",
    loopHours,
    loopSeconds,
    sourceStartTimeUtc: startTime.toISOString(),
    rowCount: rows,
    tagCount: tags.length,
    eventFrameCount: events,
    defaultReplay: { mode: "loop", speedMultiplier: 60, timestampMode: "restamp_to_current_utc", outputFormat: "jsonl" },
    scenarios,
    files: {
      telemetryLoop: "data/pi_telemetry_loop.csv",
      eventFrames: "data/pi_event_frames.csv",
      replayScript: "scripts/replay_pi_telemetry.js"
    }
  };
  fs.writeFileSync(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ rows, events, tags: tags.length }, null, 2));
}

main();
