import { spawn } from "node:child_process";
export async function execFile(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }
            reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr || stdout}`.trim()));
        });
    });
}
export async function execShell(command, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd: options.cwd,
            env: options.env,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }
            reject(new Error(`Command failed: ${command}\n${stderr || stdout}`.trim()));
        });
    });
}
//# sourceMappingURL=process.js.map