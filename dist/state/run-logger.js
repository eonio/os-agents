import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
export class RunLogger {
    logPath;
    constructor(logPath) {
        this.logPath = logPath;
    }
    async log(message) {
        await mkdir(dirname(this.logPath), { recursive: true });
        await appendFile(this.logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
    }
    async read() {
        try {
            return await readFile(this.logPath, "utf8");
        }
        catch {
            return "";
        }
    }
    async tail(lines = 100) {
        const content = await this.read();
        return content.split(/\r?\n/).filter(Boolean).slice(-lines);
    }
}
//# sourceMappingURL=run-logger.js.map