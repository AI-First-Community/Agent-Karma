# Third-party notices

Agent Karma is licensed under Apache-2.0 (see [`LICENSE`](LICENSE)). It redistributes
or bundles the third-party components below, each under its own license. This file
collects the required copyright and license notices.

## Redistributed fonts

### Manrope
- **License:** SIL Open Font License, Version 1.1 (OFL-1.1)
- **Copyright:** © 2019 The Manrope Project Authors (https://github.com/sharanda/manrope)
- **Where it ships:** the VS Code extension (`extension/media/fonts/manrope.woff2`) and the
  web app (`site/public/fonts/manrope.woff2`, and embedded into the generated Karma Card SVG).
- **Full license text:** [`extension/media/fonts/Manrope-OFL.txt`](extension/media/fonts/Manrope-OFL.txt)
  and [`site/public/fonts/Manrope-OFL.txt`](site/public/fonts/Manrope-OFL.txt).

## Bundled software (web app build)

The learning platform (`site/`) is built with, and ships compiled output from, the
following components, each under the MIT License:

| Component | License | Copyright |
|---|---|---|
| Astro | MIT | © Astro Technology Company and contributors |
| Starlight (`@astrojs/starlight`) | MIT | © Astro contributors |
| Svelte (`@astrojs/svelte`, `svelte`) | MIT | © Svelte contributors |
| Shiki (via Starlight) | MIT | © Pine Wu and Shiki contributors |

Full MIT license texts are available in each package's `node_modules/<pkg>/LICENSE`
and at the projects' repositories.

## Trademarks

Product names referenced in Agent Karma's documentation and UI are the property of their
respective owners and are used for identification (nominative fair use) only:

- **VS Code** and **GitHub Copilot** are trademarks of Microsoft Corporation.
- **Claude** and **Claude Code** are trademarks of Anthropic, PBC.
- **Cursor** is a trademark of Anysphere Inc.
- **ChatGPT** is a trademark of OpenAI.

Agent Karma is an independent, community project and is **not** affiliated with, endorsed
by, or sponsored by any of these companies, or by any employer or vendor.
