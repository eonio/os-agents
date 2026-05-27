import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";

export class RunLogger {
  public constructor(private readonly logPath: string) {}

  public async log(message: string): Promise<void> {
    await mkdir(dirname(this.logPath), { recursive: true });
    await appendFile(this.logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  }

  public async read(): Promise<string> {
    try {
      return await readFile(this.logPath, "utf8");
    } catch {
      return "";
    }
  }

  public async tail(lines = 100): Promise<string[]> {
    const content = await this.read();
    return content.split(/\r?\n/).filter(Boolean).slice(-lines);
  }
}
