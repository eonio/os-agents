export interface CommandResult {
    stdout: string;
    stderr: string;
}
export interface ExecOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}
export declare function execFile(command: string, args: string[], options?: ExecOptions): Promise<CommandResult>;
export declare function execShell(command: string, options?: ExecOptions): Promise<CommandResult>;
