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
