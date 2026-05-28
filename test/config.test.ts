import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  delete process.env.OS_AGENTS_HOME;
});

describe("loadConfig", () => {
  it("uses the default Copilot home when baseDirectory is not configured", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "os-agents-config-"));
    process.chdir(projectRoot);

    const config = await loadConfig();

    expect(config.copilot.baseDirectory).toBeUndefined();
  });

  it("keeps an explicit Copilot baseDirectory when configured", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "os-agents-config-"));
    const baseDirectory = path.join(projectRoot, ".custom-copilot");
    process.chdir(projectRoot);
    await writeFile(
      path.join(projectRoot, "os-agents.config.json"),
      JSON.stringify({
        copilot: {
          baseDirectory,
        },
      }),
      "utf8",
    );

    const config = await loadConfig();

    expect(config.copilot.baseDirectory).toBe(baseDirectory);
  });
});
