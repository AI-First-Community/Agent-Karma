import { describe, it, expect } from "vitest";
import { renderStartForm } from "./startSessionHtml";

const base = {
  nonce: "n0nce",
  cspSource: "vscode-resource:",
  aiTools: ["GitHub Copilot", "Claude Code", "Cursor"] as const,
  taskTypes: ["Bug Fix", "Documentation"] as const,
};

describe("renderStartForm", () => {
  it("renders the form fields and a nonce'd CSP + script", () => {
    const html = renderStartForm(base);
    expect(html).toContain('id="title"');
    expect(html).toContain('id="aiTool"');
    expect(html).toContain('id="taskType"');
    expect(html).toContain('id="intent"');
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("nonce-n0nce");
    expect(html).toContain("acquireVsCodeApi");
  });

  it("pre-selects the last-used AI tool and task type", () => {
    const html = renderStartForm({ ...base, lastTool: "Claude Code", lastTask: "Documentation" });
    expect(html).toContain(`<option value="Claude Code" selected>`);
    expect(html).toContain(`<option value="Documentation" selected>`);
  });

  it("escapes option values (no injection)", () => {
    const html = renderStartForm({ ...base, aiTools: ['<img onerror=x>'] as unknown as readonly string[] });
    expect(html).not.toContain("<img onerror=x>");
    expect(html).toContain("&lt;img onerror=x&gt;");
  });
});
