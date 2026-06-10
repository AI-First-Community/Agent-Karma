import {
  FileSavedEventData,
  ValidationCommandEventData,
  ValidationResult,
} from "../core/types";
import { getExtension, isTestFile } from "../utils/fileUtils";
import { classifyCommand } from "../utils/commandClassifier";

/**
 * The single, auditable place where capture is reduced to safe metadata.
 *
 * Prime Directives enforced here:
 * - file CONTENT is never read or stored — only name/extension/isTestFile (+ path opt-in)
 * - the RAW command string is used transiently to classify, then DISCARDED — never returned
 */

/** Build a file-saved event payload. `fullPath` is included only when opted in. */
export function toFileSavedData(
  fileName: string,
  fullPath: string,
  storeFullPath: boolean
): FileSavedEventData {
  const data: FileSavedEventData = {
    fileName,
    extension: getExtension(fileName),
    isTestFile: isTestFile(fileName),
  };
  if (storeFullPath) {
    data.fullPath = fullPath;
  }
  return data;
}

/**
 * Build a validation-command event payload from a raw command string.
 * The raw string is consumed here for classification and never escapes this function.
 */
export function toValidationData(
  rawCommand: string,
  result: ValidationResult,
  source: "observed" | "logged"
): ValidationCommandEventData {
  return {
    commandType: classifyCommand(rawCommand),
    result,
    source,
  };
}

/** Convert a typed payload into the plain record shape an event carries. */
export function asEventData(payload: object): Record<string, unknown> {
  return { ...payload } as Record<string, unknown>;
}
