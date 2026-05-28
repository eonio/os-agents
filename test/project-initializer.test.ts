import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { ProjectInitializer } from "../src/services/project-initializer.js";
import { createTestConfig } from "./helpers.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("ProjectInitializer", () => {
  it("initializes the current project folder for OS Agents", async () => {
    const config = await createTestConfig("project-initializer");
    process.chdir(config.projectRoot);

    const initializer = new ProjectInitializer(config.projectRoot);
    await initializer.initialize();

    expect(await initializer.isInitialized()).toBe(true);

    const gitIgnore = await readFile(path.join(config.projectRoot, ".gitignore"), "utf8");
    expect(gitIgnore).toContain("node_modules/");
    expect(gitIgnore).toContain(".os-agents/");
    expect(gitIgnore).toContain("openspec/");

    const exampleConfig = await readFile(
      path.join(config.projectRoot, "os-agents.config-example.json"),
      "utf8",
    );
    expect(exampleConfig).toContain('"workflow"');
  });

  it("tells the user to run init when the project is not initialized", async () => {
    const config = await createTestConfig("project-initializer-cli");
    process.chdir(config.projectRoot);

    await expect(runCli(["node", "os-agents", "list"])).rejects.toThrow(
      /run "os-agents init" in this folder first/i,
    );
  });
});
