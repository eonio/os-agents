export declare class RunLogger {
    private readonly logPath;
    constructor(logPath: string);
    log(message: string): Promise<void>;
    read(): Promise<string>;
    tail(lines?: number): Promise<string[]>;
}
