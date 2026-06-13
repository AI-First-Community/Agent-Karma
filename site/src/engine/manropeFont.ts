// Build-time embed of the extension's Manrope woff2 as a `data:` URI, so the
// shareable Karma Card SVG stays a standalone, offline, no-network asset (the
// same guarantee the extension makes). Vite's `?inline` suffix base64-inlines
// the asset at build time; we normalize the MIME header for correctness.
//
// This also validates the SECOND cross-`../extension` mechanism (importing a
// binary asset from outside `site/`), distinct from the engine source import.
import url from "../../../extension/media/fonts/manrope.woff2?inline";

export const manropeDataUri: string = url.replace(
  /^data:[^;]*;base64,/,
  "data:font/woff2;base64,"
);
