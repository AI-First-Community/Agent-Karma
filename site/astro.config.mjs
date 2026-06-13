// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import AstroPWA from "@vite-pwa/astro";
import { fileURLToPath } from "node:url";

// Served from GitHub Pages as a PROJECT site, so everything lives under the
// repo-name subpath. Keep the trailing slash; `${base}foo` then yields correct
// absolute URLs, and `import.meta.env.BASE_URL` matches this exactly.
const base = "/Agent-Karma/";

// Starlight rebases its own nav onto `base`, but NOT root-absolute links written
// inside doc content (e.g. `[x](/reference/privacy/)`). This remark plugin does
// that at build time, so content stays base-agnostic (the wiki mirror, which
// reads the raw `/...` links, is unaffected). Dependency-free mdast walk.
function remarkBaseLinks() {
  const prefix = base.replace(/\/$/, "");
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (
      (node.type === "link" || node.type === "definition") &&
      typeof node.url === "string" &&
      node.url.startsWith("/") &&
      !node.url.startsWith("//") &&
      !node.url.startsWith(base)
    ) {
      node.url = prefix + node.url;
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

// The site reuses the extension's PURE engine by importing its TypeScript SOURCE
// directly via the `@karma` alias (the engine barrel src/engine/karma.ts is the
// only door). Vite/esbuild transpiles the .ts for the browser; a no-node guard
// (npm run check:no-node) fails the build if a vscode/node import ever leaks.
export default defineConfig({
  site: "https://ai-first-community.github.io",
  base,
  markdown: { remarkPlugins: [remarkBaseLinks] },
  integrations: [
    starlight({
      title: "Agent Karma",
      description:
        "Did you verify what the AI produced before you trusted it? A local-first AI-coding validation coach for VS Code.",
      logo: { src: "./src/assets/chakra.svg", alt: "Agent Karma" },
      customCss: ["./src/styles/tokens.css", "./src/styles/brand.css"],
      head: [
        { tag: "link", attrs: { rel: "manifest", href: `${base}manifest.webmanifest` } },
        { tag: "meta", attrs: { name: "theme-color", content: "#1a1410" } },
        { tag: "script", attrs: { src: `${base}registerSW.js`, defer: true } },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/AI-First-Community/Agent-Karma",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "The verification gap", slug: "start/introduction" },
            { label: "Install", slug: "start/install" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "How the Karma Score works", slug: "concepts/scoring" },
            { label: "Validation types", slug: "concepts/validation-types" },
          ],
        },
        {
          label: "Features",
          items: [
            { label: "Sessions & the Dharma Card", slug: "features/sessions" },
            { label: "Dashboard & cards", slug: "features/dashboard-and-cards" },
            { label: "Readiness, nudge & chat", slug: "features/safety-nets" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Privacy & data", slug: "reference/privacy" },
            { label: "Settings", slug: "reference/settings" },
            { label: "Commands", slug: "reference/commands" },
          ],
        },
        {
          label: "Guides",
          items: [{ label: "FAQ", slug: "guides/faq" }],
        },
      ],
    }),
    svelte(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Agent Karma",
        short_name: "Agent Karma",
        description:
          "A local-first AI-coding validation coach — learn the idea, practice in the Validation Dojo, and earn your Karma Card.",
        theme_color: "#1a1410",
        background_color: "#0c0e12",
        display: "standalone",
        id: base,
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the app shell (JS/CSS/font/icons). Astro emits nested HTML
        // after the SW is built, so pages are cached at runtime instead (below).
        globPatterns: ["**/*.{js,css,svg,png,woff2}"],
        navigateFallback: `${base}404.html`,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Any page you visit is cached → works offline next time.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "ak-pages", expiration: { maxEntries: 60 } },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker", "font", "image"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "ak-assets" },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        "@karma": fileURLToPath(new URL("../extension/src", import.meta.url)),
      },
    },
  },
});
