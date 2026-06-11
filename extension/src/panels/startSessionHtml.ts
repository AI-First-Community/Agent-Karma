export interface StartFormData {
  nonce: string;
  cspSource: string;
  aiTools: readonly string[];
  taskTypes: readonly string[];
  lastTool?: string;
  lastTask?: string;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function options(items: readonly string[], selected: string | undefined): string {
  return items
    .map(
      (i) =>
        `<option value="${esc(i)}" ${i === selected ? "selected" : ""}>${esc(i)}</option>`
    )
    .join("");
}

/** The Start Session form. A nonce'd script posts the values back to the panel. */
export function renderStartForm(d: StartFormData): string {
  const csp = [
    `default-src 'none'`,
    `style-src 'nonce-${d.nonce}'`,
    `script-src 'nonce-${d.nonce}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style nonce="${d.nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1.25rem 1.5rem; max-width: 640px; }
    h1 { font-size: 1.25rem; margin: 0; }
    .tagline { color: var(--vscode-descriptionForeground); margin: 0.25rem 0 1.25rem; }
    label { display: block; font-size: 0.85rem; margin: 0.9rem 0 0.25rem; color: var(--vscode-descriptionForeground); }
    input, select, textarea {
      width: 100%; box-sizing: border-box; padding: 0.45rem 0.55rem; font-family: inherit; font-size: 0.95rem;
      color: var(--vscode-input-foreground); background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 4px;
    }
    textarea { min-height: 4.5rem; resize: vertical; }
    .row { display: flex; gap: 1rem; }
    .row > div { flex: 1; }
    .actions { margin-top: 1.4rem; display: flex; gap: 0.6rem; }
    button { font-family: inherit; font-size: 0.92rem; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
    .primary { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
    .primary:hover { background: var(--vscode-button-hoverBackground); }
    .secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .hint { color: var(--vscode-descriptionForeground); font-size: 0.8rem; margin-top: 0.3rem; }
  </style>
  <title>Start Session</title>
</head>
<body>
  <h1>🪔 Start a session</h1>
  <p class="tagline">Set your intent. Agent Karma will help you check whether you validated the result.</p>
  <form id="form">
    <label for="title">What are you working on?</label>
    <input id="title" type="text" placeholder="e.g. Fix the login failure bug" autofocus />

    <div class="row">
      <div>
        <label for="aiTool">AI tool</label>
        <select id="aiTool">${options(d.aiTools, d.lastTool)}</select>
      </div>
      <div>
        <label for="taskType">Task type</label>
        <select id="taskType">${options(d.taskTypes, d.lastTask)}</select>
      </div>
    </div>

    <label for="intent">Intent <span class="hint">(optional — what are you trying to accomplish?)</span></label>
    <textarea id="intent" placeholder="e.g. Fix the login failure and add a regression test"></textarea>

    <div class="actions">
      <button type="submit" class="primary">Start session</button>
      <button type="button" id="cancel" class="secondary">Cancel</button>
    </div>
  </form>

  <script nonce="${d.nonce}">
    const vscode = acquireVsCodeApi();
    const byId = (id) => document.getElementById(id);
    byId("form").addEventListener("submit", (e) => {
      e.preventDefault();
      vscode.postMessage({
        type: "start",
        payload: {
          title: byId("title").value.trim() || "Untitled session",
          aiTool: byId("aiTool").value,
          taskType: byId("taskType").value,
          intent: byId("intent").value.trim(),
        },
      });
    });
    byId("cancel").addEventListener("click", () => vscode.postMessage({ type: "cancel" }));
  </script>
</body>
</html>`;
}
