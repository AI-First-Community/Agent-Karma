# Publishing Agent Karma to the VS Code Marketplace

A repeatable release checklist. Agent Karma is a single individual/community project — the publisher and author identity is the individual maintainer only.

## One-time setup

1. **Create a publisher.** Sign in at <https://marketplace.visualstudio.com/manage> with the account that owns publisher id **`passion4architecture`** (must match `package.json` → `publisher`). If it doesn't exist yet, create it there.
2. **Create a Personal Access Token (PAT).** In Azure DevOps (<https://dev.azure.com>), create a token with **Organization: All accessible organizations** and scope **Marketplace → Manage**. Copy it somewhere safe — it's shown once.
3. **Log in `vsce` locally:**
   ```bash
   cd extension
   npx vsce login passion4architecture     # paste the PAT when prompted
   ```

## Pre-flight (every release)

- [ ] `package.json` `version` bumped (semver) and matches the new `CHANGELOG.md` heading.
- [ ] `CHANGELOG.md` has a top entry for this version.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green (unit) and, if touched, `npm run test:integration`.
- [ ] `npm run build` succeeds, then `npm run check:no-network` passes (CI-enforced no-network guard).
- [ ] README renders correctly — **all images use absolute `https://raw.githubusercontent.com/...` URLs** (the Marketplace does **not** render relative image paths).
- [ ] Screenshots from [`extension/media/screenshots/README.md`](../extension/media/screenshots/README.md) are committed to `main` **and the repo is public** (raw URLs only resolve on a public repo).
- [ ] Authorship scrub: no employer reference, no AI-authorship trailer, author/publisher = the individual maintainer only.
- [ ] Decide on the `preview` flag in `package.json`: keep `true` while pre-1.0; **remove it for the 1.0 listing** so the "Preview" badge disappears.

## Package & inspect

```bash
cd extension
npm run package           # → agent-karma.vsix
npx vsce ls               # confirm the file list: dist/, README, LICENSE, media/icon.png, media/fonts — NO src, NO screenshots
```

Sanity-check the `.vsix` size (should be ~130–140 KB). Screenshots and `media/icon.svg` are excluded via `.vscodeignore`.

## Publish

```bash
cd extension
npx vsce publish                 # publishes the current package.json version
# or bump + publish in one step:
# npx vsce publish patch|minor|major
```

Then verify the live listing at
<https://marketplace.visualstudio.com/items?itemName=passion4architecture.agent-karma> —
check the hero image, feature screenshots, badges, categories, and that "Free" pricing shows.

## Post-publish

- [ ] Tag the release in git: `git tag v<version> && git push --tags`.
- [ ] (Optional) Create a GitHub Release pointing at the `CHANGELOG.md` entry, attaching the `.vsix`.
- [ ] Smoke-test: install the published extension from the Marketplace in a clean VS Code window and confirm the dashboard, a session, and the Karma Card all work.

## Notes

- **First-ever publish** requires the repo to be public so README images resolve; if you must publish while private, expect broken image previews until you make it public.
- `engines.vscode` is `^1.90.0` — don't use APIs newer than that baseline without bumping it.
- Open VSX (optional, for VSCodium/Cursor users): `npx ovsx publish agent-karma.vsix -p <OPENVSX_TOKEN>` after creating an Open VSX publisher. Not required for the VS Code Marketplace.
