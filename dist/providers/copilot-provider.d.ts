import type { AppConfig, RunRecord } from "../domain/types.js";
import { RunLogger } from "../state/run-logger.js";
export declare class CopilotProvider {
    private readonly config;
    constructor(config: AppConfig);
    implement(run: RunRecord, logger: RunLogger): Promise<{
        sessionId: string;
        summary?: string;
    }>;
}
