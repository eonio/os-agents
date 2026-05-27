const ORDERED_ACTIVE_PHASES = [
    "queued",
    "preparing-workspace",
    "drafting-spec",
    "implementing",
    "handoff",
];
export function isTerminalPhase(phase) {
    return phase === "completed" || phase === "failed" || phase === "cancelled";
}
export function canTransition(current, next) {
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
    const currentIndex = ORDERED_ACTIVE_PHASES.indexOf(current);
    const nextIndex = ORDERED_ACTIVE_PHASES.indexOf(next);
    return currentIndex >= 0 && nextIndex === currentIndex + 1;
}
export function assertTransition(current, next) {
    if (!canTransition(current, next)) {
        throw new Error(`Invalid workflow transition from "${current}" to "${next}".`);
    }
}
//# sourceMappingURL=workflow.js.map