import { normalizeLumaUrl, fetchLumaEvent } from "../lib/luma";
import { generateSummaries } from "../lib/summaries";
import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

async function main() {
  const url = normalizeLumaUrl("https://luma.com/claude-ru1w");
  console.log("normalized:", url);
  const ev = await fetchLumaEvent(url);
  console.log(JSON.stringify({ ...ev, description: ev.description?.slice(0, 200) }, null, 2));
  const s = await generateSummaries({
    kind: "event",
    title: ev.title,
    description: ev.description,
    extra: `${ev.location ?? ""} ${ev.starts_at ?? ""}`,
  });
  console.log("--- TH ---");
  console.log(s?.th);
  console.log("--- ZH ---");
  console.log(s?.zh);
}

main();
