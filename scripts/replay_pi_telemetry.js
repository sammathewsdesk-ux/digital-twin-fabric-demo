const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

const input = getArg("--input", path.join(root, "data", "pi_telemetry_loop.csv"));
const output = getArg("--output", path.join(root, "data", "live_pi_stream.jsonl"));
const snapshot = getArg("--snapshot", path.join(root, "data", "live_pi_latest_snapshot.json"));
const speed = Number(getArg("--speed", "60"));
const durationSeconds = Number(getArg("--duration-seconds", "120"));
const maxRecords = Number(getArg("--max-records", "0"));
const shouldLoop = hasArg("--loop");

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function writeSnapshot(latest) {
  fs.writeFileSync(snapshot, `${JSON.stringify({
    snapshot_time_utc: new Date().toISOString(),
    tag_count: Object.keys(latest).length,
    tags: latest
  }, null, 2)}\n`, "utf8");
}

async function replay() {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(path.dirname(snapshot), { recursive: true });

  const rows = parseCsv(input);
  const groups = new Map();
  for (const row of rows) {
    const second = Number(row.loop_second);
    if (!groups.has(second)) groups.set(second, []);
    groups.get(second).push(row);
  }
  const seconds = [...groups.keys()].sort((a, b) => a - b);
  const stream = fs.createWriteStream(output, { flags: "a", encoding: "utf8" });
  const latest = {};
  const replayStartWall = Date.now();
  const replayStartUtc = Date.now();
  let emitted = 0;
  let loopOffset = 0;

  while (true) {
    for (const sourceLoopSecond of seconds) {
      const elapsedSeconds = (Date.now() - replayStartWall) / 1000;
      if (elapsedSeconds >= durationSeconds) {
        stream.end();
        writeSnapshot(latest);
        console.log(JSON.stringify({ emittedRecords: emitted, output, snapshot }, null, 2));
        return;
      }

      const targetElapsed = (loopOffset + sourceLoopSecond) / speed;
      const delay = targetElapsed - elapsedSeconds;
      if (delay > 0) await sleep(delay * 1000);

      for (const row of groups.get(sourceLoopSecond)) {
        const payload = {
          timestamp: new Date(replayStartUtc + (loopOffset + sourceLoopSecond) * 1000).toISOString(),
          source_loop_second: sourceLoopSecond,
          tag_id: row.tag_id,
          tag_name: row.tag_name,
          asset_id: row.asset_id,
          value: Number(row.value),
          engineering_unit: row.engineering_unit,
          quality: row.quality,
          scenario: row.scenario
        };
        stream.write(`${JSON.stringify(payload)}\n`);
        latest[payload.tag_id] = payload;
        emitted += 1;
        if (maxRecords > 0 && emitted >= maxRecords) {
          stream.end();
          writeSnapshot(latest);
          console.log(JSON.stringify({ emittedRecords: emitted, output, snapshot }, null, 2));
          return;
        }
      }
    }
    if (!shouldLoop) break;
    loopOffset += seconds[seconds.length - 1] + 1;
  }

  stream.end();
  writeSnapshot(latest);
  console.log(JSON.stringify({ emittedRecords: emitted, output, snapshot }, null, 2));
}

replay().catch((error) => {
  console.error(error);
  process.exit(1);
});
