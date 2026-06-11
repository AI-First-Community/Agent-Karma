import * as path from "path";
import Mocha from "mocha";

// Mocha entry point invoked inside the Extension Host (no glob — explicit files
// keep this robust across dependency versions).
export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true, timeout: 30000 });
  mocha.addFile(path.resolve(__dirname, "./extension.itest.js"));

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} integration test(s) failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
