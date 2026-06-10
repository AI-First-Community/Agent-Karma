import { describe, it, expect } from "vitest";
import { toFileSavedData, toValidationData } from "./privacyRules";

describe("privacyRules", () => {
  it("toFileSavedData captures metadata only and omits the path unless opted in", () => {
    const off = toFileSavedData("auth.service.ts", "/Users/x/secret/auth.service.ts", false);
    expect(off).toEqual({ fileName: "auth.service.ts", extension: "ts", isTestFile: false });
    expect(off.fullPath).toBeUndefined();

    const on = toFileSavedData("auth.spec.ts", "/Users/x/secret/auth.spec.ts", true);
    expect(on.isTestFile).toBe(true);
    expect(on.fullPath).toBe("/Users/x/secret/auth.spec.ts");
  });

  it("toValidationData classifies and NEVER retains the raw command string", () => {
    const data = toValidationData("npm test -- --grep secret-prod-token", "passed", "observed");
    expect(data).toEqual({ commandType: "Test", result: "passed", source: "observed" });
    // the raw command (which could carry secrets) must not be present anywhere
    expect(JSON.stringify(data)).not.toContain("secret-prod-token");
    expect(JSON.stringify(data)).not.toContain("npm test");
  });
});
