// Renders the GitHub stats and top-languages cards to static SVG files.
// Usage: node generate-cards.mjs <github-readme-stats checkout> <username> <output dir>
// Reads the API token from the PAT_1 environment variable.
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [upstream, username, outDir] = process.argv.slice(2);
if (!upstream || !username || !outDir) {
  console.error("usage: generate-cards.mjs <upstream dir> <username> <out dir>");
  process.exit(2);
}
if (!process.env.PAT_1) {
  console.error("PAT_1 is not set");
  process.exit(2);
}

// Portal colours, same as the streak card in README.md.
const colors = {
  bg_color: "14110f",
  border_color: "2e2823",
  title_color: "f2a541",
  icon_color: "f2a541",
  ring_color: "f2a541",
  text_color: "d9cfc3",
  border_radius: "12",
  disable_animations: "true",
};

const cards = [
  {
    file: "stats.svg",
    handler: "api/index.js",
    query: { show_icons: "true", ...colors },
  },
  {
    file: "top-langs.svg",
    handler: "api/top-langs.js",
    query: { layout: "compact", langs_count: "8", ...colors },
  },
];

await mkdir(outDir, { recursive: true });

for (const card of cards) {
  const { default: handler } = await import(
    pathToFileURL(resolve(upstream, card.handler)).href
  );
  let body = "";
  const res = {
    setHeader() {},
    send(data) {
      body = String(data).trim();
      return res;
    },
  };
  await handler({ query: { username, ...card.query } }, res);
  // The upstream handlers report failures as an SVG error card.
  if (!body.startsWith("<svg") || body.includes("Something went wrong")) {
    console.error(`Failed to render ${card.file}`);
    process.exit(1);
  }
  await writeFile(join(outDir, card.file), body);
  console.log(`Wrote ${join(outDir, card.file)}`);
}
