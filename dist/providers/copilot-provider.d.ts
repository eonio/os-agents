import type { AppConfig, RunRecord } from "../domain/types.js";
import { RunLogger } from "../state/run-logger.js";
export declare function isAuthorizationError(error: unknown): boolean;
export declare function isModelUnavailableError(error: unknown): boolean;
export declare class CopilotProvider {
    private readonly config;
    constructor(config: AppConfig);
    private runSession;
    implement(run: RunRecord, logger: RunLogger): Promise<{
        sessionId: string;
        summary?: string;
    }>;
}
