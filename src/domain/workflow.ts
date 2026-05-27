import type { ActivePhase, WorkflowPhase } from "./types.js";

const ORDERED_ACTIVE_PHASES: ActivePhase[] = [
  "queued",
  "preparing-workspace",
  "drafting-spec",
  "implementing",
  "handoff",
];

export function isTerminalPhase(phase: WorkflowPhase): boolean {
  return phase === "completed" || phase === "failed" || phase === "cancelled";
}

export function canTransition(current: WorkflowPhase, next: WorkflowPhase): boolean {
  if (current === next) {
    return true;
  }

  if (isTerminalPhase(current)) {
    return false;
  }

  if (next === "failed" || next === "cancelled") {
    return true;
  }

  if (next === "completed") {
    return current === "handoff";
  }

  const currentIndex = ORDERED_ACTIVE_PHASES.indexOf(current as ActivePhase);
  const nextIndex = ORDERED_ACTIVE_PHASES.indexOf(next as ActivePhase);
  return currentIndex >= 0 && nextIndex === currentIndex + 1;
}

export function assertTransition(current: WorkflowPhase, next: WorkflowPhase): void {
  if (!canTransition(current, next)) {
    throw new Error(`Invalid workflow transition from "${current}" to "${next}".`);
  }
}
