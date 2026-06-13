import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const VALIDATION = z.enum(["Test", "Build", "Lint", "Type Check", "Security", "Other"]);

// Validation Dojo scenarios — authorable JSON, Zod-validated (authors get type
// errors on a bad scenario). `hiddenIssues[].kind` uses the same validation
// taxonomy the engine reads, so buildEvents can score with the real engine.
const dojo = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/dojo" }),
  schema: z.object({
    title: z.string(),
    difficulty: z.enum(["white", "green", "brown", "black"]),
    summary: z.string(),
    task: z.string(),
    language: z.string().default("typescript"),
    fileName: z.string().default("change.ts"),
    code: z.string(),
    hiddenIssues: z.array(
      z.object({
        kind: VALIDATION,
        severity: z.enum(["low", "med", "high"]),
        title: z.string(),
        explanation: z.string(),
      })
    ),
    availableValidations: z.array(
      z.object({ commandType: VALIDATION, label: z.string() })
    ),
    debrief: z.string(),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  dojo,
};
