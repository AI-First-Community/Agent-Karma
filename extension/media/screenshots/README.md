# Marketplace screenshots — shot list

These images are referenced by **absolute raw-GitHub URL** from [`../../README.md`](../../README.md), so they render on the VS Code Marketplace listing. They are **excluded from the packaged `.vsix`** (see `.vscodeignore`) — they only need to exist on the `main` branch of the public repo.

> The repo is private until v1.0. Raw URLs (`raw.githubusercontent.com/.../main/...`) only resolve once the repo is **public**, so the listing images will appear when you make the repo public at launch. Until then, the README image links will show as broken previews — that's expected.

## Capture settings
- **Theme:** capture in **Dark+** (default dark). Optionally also Light+ for one or two.
- **Width:** ~1000–1200px. Crop tightly to the panel/view — no full desktop, no OS chrome.
- **Format:** PNG for stills, GIF (or MP4 converted to GIF) for the hero. Keep the hero GIF under ~5 MB.
- **Content:** use a realistic-but-clean session. No employer names, no private repo paths, no secrets visible.

## Required shots

| Filename | View / state to capture | Notes |
|---|---|---|
| `hero.gif` | A 10–15s loop: **Start session → edit & save a file → run tests in terminal → End → dashboard opens** | The single most important asset. Shows the whole loop. |
| `dashboard.png` | The **insight dashboard**, scrolled to the top (karmic reflection + Karma/validation trend lines + a couple of widgets) | The fixed bars/heatmap should be visibly filled. |
| `start-session.png` | The **Start Session** panel with Title / AI tool / Task type / Intent filled in | Use a believable example ("Fix the login failure bug"). |
| `karma-card.png` | A generated **Karma Card** certificate (the personalised SVG or printable PDF view) | Strong closing visual. |

## Nice-to-have (optional, strengthen the listing)

| Filename | View / state |
|---|---|
| `validation-health.png` | "Can you even validate?" readiness scan, showing the biggest-gap callout |
| `heatmap.png` | The task × check "Where you validate" heatmap (coloured cells) |
| `precommit-nudge.png` | The pre-commit nudge firing in the terminal on `git commit` |
| `chat-verify.png` | `@agentkarma /verify` in the Chat view logging a validation |
| `statusbar.png` | The status bar item in both states (▶ Start and ● Recording … — End) |
| `ai-usage.png` | The opt-in local AI-usage panel (tokens / turns / wastage) |

After adding files here, no code changes are needed — the README already points at these exact names.
