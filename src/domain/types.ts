export const WORKFLOW_PHASES = [
  "queued",
  "preparing-workspace",
  "drafting-spec",
  "implementing",
  "handoff",
  "completed",
  "failed",
  "cancelled",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];
export type ActivePhase = Extract<
  WorkflowPhase,
  "queued" | "preparing-workspace" | "drafting-spec" | "implementing" | "handoff"
>;

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type DispatchStatus = "pending" | "published" | "skipped" | "failed";
export type RemoteSessionMode = "off" | "export" | "on";
export type WorkflowProviderId = "openspec" | "speckit";
export type RunKind = "orchestrator" | "developer";

export interface RepositoryRef {
  input: string;
  cloneUrl: string;
  owner?: string;
  name?: string;
  provider: "github" | "git" | "local";
}

export interface PhaseRecord {
  phase: WorkflowPhase;
  at: string;
  message?: string;
}

export interface IntegrationState {
  copilotSessionId?: string;
  remoteSessionMode: RemoteSessionMode;
  dispatchStatus: DispatchStatus;
  dispatchResponse?: string;
}

export interface WorkflowProgress {
  total: number;
  complete: number;
  remaining: number;
}

export interface WorkflowState {
  provider: WorkflowProviderId;
  changeName?: string;
  changeDirectory?: string;
  applyState?: string;
  progress?: WorkflowProgress;
  lastStatusSummary?: string;
}

export interface PersonaProfile {
  id: string;
  name: string;
  title: string;
  summary: string;
  style: string;
  valueFocus: string;
  internalMonologue: string;
}

export interface TeamMemberResult {
  runId: string;
  personaId: string;
  name: string;
  status: RunStatus;
  summary?: string;
  changeName?: string;
}

export interface TeamVote {
  personaId: string;
  name: string;
  score: number;
  rationale: string;
}

export interface TeamAgreement {
  round: number;
  score: number;
  accepted: boolean;
  summary: string;
  votes: TeamVote[];
  strategy: "individual" | "merge";
  selectedPersonaId?: string;
  selectedPersonaName?: string;
}

export interface TeamState {
  orchestratorName: string;
  developerRunIds: string[];
  memberResults: TeamMemberResult[];
  deliberationRounds: TeamAgreement[];
  finalAgreement?: TeamAgreement;
  finalWorkspacePath?: string;
}

export interface HandoffArtifact {
  runId: string;
  kind: RunKind;
  repository: string;
  baseBranch: string;
  featureBranch: string;
  feature: string;
  workspacePath: string;
  summary?: string;
  status: RunStatus;
  phase: WorkflowPhase;
  sessionId?: string;
  commitSha?: string;
  createdAt: string;
  updatedAt: string;
  parentRunId?: string;
  personaId?: string;
  workflow: WorkflowState;
  team?: TeamState;
}

export interface RunRecord {
  id: string;
  kind: RunKind;
  repository: RepositoryRef;
  baseBranch: string;
  feature: string;
  featureSlug: string;
  featureBranch: string;
  workspacePath: string;
  logPath: string;
  handoffPath: string;
  status: RunStatus;
  phase: WorkflowPhase;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  pid?: number;
  parentRunId?: string;
  personaId?: string;
  cancellationRequested: boolean;
  summary?: string;
  error?: string;
  integration: IntegrationState;
  workflow: WorkflowState;
  team?: TeamState;
  history: PhaseRecord[];
}

export interface RetentionPolicy {
  completed: boolean;
  failed: boolean;
  cancelled: boolean;
}

export interface SpeckitConfig {
  draftCommand: string;
  handoffCommand: string;
}

export interface OpenSpecConfig {
  changePrefix: string;
  createChangeCommand: string;
  statusCommand: string;
  applyCommand: string;
  handoffCommand: string;
}

export interface WorkflowConfig {
  defaultProvider: WorkflowProviderId;
  openspec: OpenSpecConfig;
  speckit: SpeckitConfig;
}

export interface GitHubConfig {
  token?: string;
  apiBaseUrl: string;
  dispatchEventType: string;
  preferSsh: boolean;
}

export interface CopilotConfig {
  model: string;
  logLevel: "none" | "error" | "warning" | "info" | "debug" | "all";
  baseDirectory: string;
  remoteSessionMode: RemoteSessionMode;
}

export interface AppConfig {
  stateRoot: string;
  workspaceRoot: string;
  runsRoot: string;
  logsRoot: string;
  handoffsRoot: string;
  retention: RetentionPolicy;
  workflow: WorkflowConfig;
  github: GitHubConfig;
  copilot: CopilotConfig;
}

export interface SpawnRequest {
  repository: string;
  baseBranch: string;
  features: string[];
}

export interface SpawnResult {
  runs: RunRecord[];
}
