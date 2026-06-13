// Generate a flat GitHub Wiki mirror from the canonical Starlight docs.
//
// The docs site (src/content/docs/**) is the single source of truth. GitHub
// wikis render plain Markdown — no MDX, no JSX, no folders — so this script
// transforms each .mdx page into one flat .md page plus a _Sidebar.md, written
// to ./wiki/. The wiki-sync workflow pushes that folder to <repo>.wiki.git.
//
// The one dynamic piece — the Karma Score rule table — is rendered from the
// REAL engine (the same KARMA_RULES the extension uses), bundled on the fly
// with esbuild, so the wiki can never drift from the code.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, "..");
const docsDir = join(siteRoot, "src/content/docs");
const outDir = join(siteRoot, "wiki");

// Where the canonical app pages live (Dojo / Progress aren't wiki pages).
// Override with SITE_URL in CI once the final host is known.
const SITE_URL = (process.env.SITE_URL || "https://agentkarma.dev").replace(/\/$/, "");

// Group display names + order, mirroring astro.config.mjs's sidebar.
const GROUPS = [
  { dir: "start", label: "Start here", order: ["introduction", "value", "install"] },
  { dir: "concepts", label: "Concepts", order: ["scoring", "validation-types", "what-we-capture"] },
  { dir: "features", label: "Features", order: ["overview", "sessions", "cards", "dashboard-and-cards", "safety-nets"] },
  { dir: "reference", label: "Reference", order: ["privacy", "settings", "commands"] },
  { dir: "guides", label: "Guides", order: ["faq"] },
];

const titleCaseSlugSegment = (seg) =>
  seg.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-");

// slug "concepts/validation-types" → wiki page name "Concepts-Validation-Types"
const pageNameForSlug = (slug) =>
  slug === "" ? "Home" : slug.split("/").map(titleCaseSlugSegment).join("-");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const body = m ? raw.slice(m[0].length) : raw;
  const fm = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
}

// Build the Karma Score rule table from the real engine (zero drift).
async function renderRulesTable() {
  const result = await build({
    stdin: {
      contents: `export { KARMA_RULES } from "./src/engine/karma.ts";`,
      resolveDir: siteRoot,
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    alias: { "@karma": join(siteRoot, "../extension/src") },
  });
  const tmp = join(siteRoot, ".wiki-rules.mjs");
  await writeFile(tmp, result.outputFiles[0].text);
  const { KARMA_RULES } = await import(`file://${tmp}?t=${process.pid}`);
  await rm(tmp, { force: true });

  const esc = (s) => String(s).replace(/\|/g, "\\|");
  const total = KARMA_RULES.reduce((sum, r) => sum + r.maxPoints, 0);
  const rows = KARMA_RULES.map(
    (r) => `| **${esc(r.label)}** | ${r.maxPoints} | ${esc(r.description)} |`
  );
  rows.push(`| **Total** | **${total}** / 100 | The remaining points are reserved; validation dominates by design. |`);
  return ["| Rule | Max points | What it rewards |", "| --- | ---: | --- |", ...rows].join("\n");
}

function transformBody(body, rulesTable) {
  return (
    body
      // Drop MDX import lines.
      .replace(/^import\s.*$/gm, "")
      // <Steps> just wraps an ordered list — keep the list, drop the wrapper.
      .replace(/<\/?Steps>/g, "")
      // The engine-rendered rule table.
      .replace(/<KarmaRulesTable\s*\/>/g, rulesTable)
      // <Card title="X" ...>body</Card> → "### X\nbody"
      .replace(/<Card\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/Card>/g, (_m, t, inner) => `### ${t}\n${inner.trim()}\n`)
      .replace(/<\/?CardGrid>/g, "")
      // Strip stray inline HTML wrappers, keep their text.
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (_m, inner) => inner.trim())
      // Doc-to-doc links: /concepts/scoring/ → Concepts-Scoring (wiki page name).
      .replace(/\]\(\/((?:start|concepts|features|reference|guides)\/[a-z0-9-]+)\/\)/g,
        (_m, slug) => `](${pageNameForSlug(slug)})`)
      // App-only pages live on the site, not the wiki.
      .replace(/\]\(\/(dojo|progress)\/\)/g, (_m, p) => `](${SITE_URL}/${p}/)`)
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const rulesTable = await renderRulesTable();
  const files = await walk(docsDir);
  const banner = `> 📖 This page mirrors the [canonical Agent Karma docs](${SITE_URL}). Edits should be made there, not in the wiki.\n\n`;

  for (const file of files) {
    const slug = relative(docsDir, file).replace(/\.mdx$/, "").replace(/\/index$/, "").replace(/^index$/, "");
    const { fm, body } = parseFrontmatter(await readFile(file, "utf8"));

    let md;
    let pageName;
    if (slug === "") {
      // The splash index → a hand-written Home page.
      pageName = "Home";
      md =
        `# Agent Karma\n\n${fm.description || ""}\n\n` +
        `**[▶ Install for VS Code](https://marketplace.visualstudio.com/items?itemName=innovate-with-sanjeev.agent-karma)** · ` +
        `[Try the Dojo](${SITE_URL}/dojo/) · [Learn the idea](Start-Introduction)\n\n` +
        `- **The verification gap** — everyone measures how *much* AI writes your code; nobody measures whether you **checked** it.\n` +
        `- **100% local** — no cloud, no telemetry, no login. It never reads your source code.\n` +
        `- **Dharma → Karma → Phal** — set your intent · the AI acts, you guide · validate the outcome.\n` +
        `- **Works with any AI tool** — Claude Code, Copilot, Cursor, ChatGPT — even browser & copy-paste.\n\n` +
        `Free · open-source (Apache-2.0) · an Innovate With Sanjeev project\n`;
    } else {
      pageName = pageNameForSlug(slug);
      md = banner + `# ${fm.title || pageName}\n\n` +
        (fm.description ? `*${fm.description}*\n\n` : "") +
        transformBody(body, rulesTable);
    }
    await writeFile(join(outDir, `${pageName}.md`), md);
  }

  // _Sidebar.md mirrors the Starlight sidebar grouping/order.
  const titleBySlug = {};
  for (const file of files) {
    const slug = relative(docsDir, file).replace(/\.mdx$/, "");
    const { fm } = parseFrontmatter(await readFile(file, "utf8"));
    titleBySlug[slug] = fm.title || slug;
  }
  const sidebar = ["### [Home](Home)", ""];
  for (const g of GROUPS) {
    sidebar.push(`**${g.label}**`, "");
    for (const name of g.order) {
      const slug = `${g.dir}/${name}`;
      if (titleBySlug[slug]) sidebar.push(`- [${titleBySlug[slug]}](${pageNameForSlug(slug)})`);
    }
    sidebar.push("");
  }
  await writeFile(join(outDir, "_Sidebar.md"), sidebar.join("\n").trim() + "\n");

  console.log(`Wiki generated in ${outDir} (${files.length} pages + _Sidebar.md).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
