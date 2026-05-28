import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execFile } from "../src/utils/process.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("postinstall-config-examples", () => {
  it("copies the example config and appends required gitignore entries", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "os-agents-postinstall-"));
    await writeFile(path.join(projectRoot, ".gitignore"), "dist/\n", "utf8");

    await execFile("node", ["scripts/postinstall-config-examples.js"], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        INIT_CWD: projectRoot,
      },
    });

    const gitIgnore = await readFile(path.join(projectRoot, ".gitignore"), "utf8");
    expect(gitIgnore).toContain("dist/");
    expect(gitIgnore).toContain("# OS Agents");
    expect(gitIgnore).toContain("node_modules/");
    expect(gitIgnore).toContain(".os-agents/");
    expect(gitIgnore).toContain("openspec/");

    const exampleConfig = await readFile(
      path.join(projectRoot, "os-agents.config-example.json"),
      "utf8",
    );
    expect(exampleConfig).toContain('"workflow"');
  });

  it("does not duplicate gitignore entries on repeated runs", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "os-agents-postinstall-repeat-"));

    const runScript = () =>
      execFile("node", ["scripts/postinstall-config-examples.js"], {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          INIT_CWD: projectRoot,
        },
      });

    await runScript();
    await runScript();

    const gitIgnore = await readFile(path.join(projectRoot, ".gitignore"), "utf8");
    expect(gitIgnore.match(/# OS Agents/g)).toHaveLength(1);
    expect(gitIgnore.match(/^node_modules\/$/gm)).toHaveLength(1);
    expect(gitIgnore.match(/^\.os-agents\/$/gm)).toHaveLength(1);
    expect(gitIgnore.match(/^openspec\/$/gm)).toHaveLength(1);
  });
});
