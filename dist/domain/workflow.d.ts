import type { WorkflowPhase } from "./types.js";
export declare function isTerminalPhase(phase: WorkflowPhase): boolean;
export declare function canTransition(current: WorkflowPhase, next: WorkflowPhase): boolean;
export declare function assertTransition(current: WorkflowPhase, next: WorkflowPhase): void;
