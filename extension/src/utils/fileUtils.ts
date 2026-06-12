// File metadata helpers (specification §6). Pure and testable.

/** Lowercased extension without the dot, or "" if none. */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/**
 * Heuristic test-file detection: the file name contains test / spec / _test / .spec.
 * Simple by design (specification §6); may occasionally false-positive (e.g. "latest").
 */
export function isTestFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ["test", "spec", "_test", ".spec"].some((p) => lower.includes(p));
}

/** The base name of a POSIX/Windows path. */
export function baseName(fsPath: string): string {
  const parts = fsPath.split(/[\\/]/);
  return parts[parts.length - 1] || fsPath;
}

/**
 * Directory names we never count as "work": VCS internals, dependency folders,
 * build output, and tool caches. Matters now that we watch the filesystem (not
 * just editor saves) — a `npm run build` or `git checkout` must not flood the
 * session with generated files.
 */
const IGNORED_PATH_SEGMENTS = [
  ".git", "node_modules", "dist", "out", "build", "coverage",
  ".vscode-test", ".next", ".nuxt", ".turbo", ".cache",
  "__pycache__", ".pytest_cache", ".mypy_cache", "target",
];

/** Generated / lock / noise files, by name or extension. */
const IGNORED_FILE = /(?:^|[\\/])\.DS_Store$|\.(?:log|tmp|map|lock)$/i;

/**
 * True when a path should be ignored for capture: it lives under a dependency/
 * build/cache directory, or is a generated/lock/noise file. Pure and testable.
 */
export function isIgnoredCapturePath(fsPath: string): boolean {
  const segments = fsPath.split(/[\\/]/);
  if (segments.some((s) => IGNORED_PATH_SEGMENTS.includes(s))) {
    return true;
  }
  return IGNORED_FILE.test(fsPath);
}
