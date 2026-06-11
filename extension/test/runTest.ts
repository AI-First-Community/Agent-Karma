import * as path from "path";
import { runTests } from "@vscode/test-electron";

// Downloads a VS Code instance, launches it with this extension loaded, and runs
// the integration suite in a real Extension Host. Run with: npm run test:integration
async function main(): Promise<void> {
  try {
    // out/test → extension root is two levels up.
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error("Integration tests failed:", err);
    process.exit(1);
  }
}

void main();
