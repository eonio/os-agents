export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type DispatchStatus = "pending" | "published" | "skipped" | "failed";
export type RemoteSessionMode = "off" | "export" | "on";
export type WorkflowProviderId = "openspec";
export type RunKind = "orchestrator" | "developer";

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

export interface CouncilContribution {
  personaId: string;
  name: string;
  itemId: string;
  itemTitle: string;
  round: 1 | 2;
  summary: string;
  content: string;
}

export interface TeamMemberResult {
  personaId: string;
  name: string;
  contributionCount: number;
  summary?: string;
}

export interface CouncilDecision {
  itemId: string;
  itemTitle: string;
  roundsUsed: 1 | 2;
  summary: string;
  followUpPrompt?: string;
}

export interface TeamState {
  orchestratorName: string;
  memberResults: TeamMemberResult[];
  contributions: CouncilContribution[];
  decisions: CouncilDecision[];
}

export interface PrdDiscussionItem {
  id: string;
  title: string;
  prompt: string;
  maxRounds: 2;
  roundsCompleted: 0 | 1 | 2;
  resolution?: string;
  followUpPrompt?: string;
}

export interface PrdState {
  title?: string;
  version?: string;
  date?: string;
  filePath?: string;
  workspaceFilePath?: string;
  synopsis?: string;
  finalDocument?: string;
  discussionItems: PrdDiscussionItem[];
}

export interface HandoffArtifact {
  runId: string;
  kind: RunKind;
  projectRoot: string;
  githubRepository?: string;
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
  prd?: PrdState;
}

export interface RunRecord {
  id: string;
  kind: RunKind;
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
  prd?: PrdState;
  history: PhaseRecord[];
}

export interface RetentionPolicy {
  completed: boolean;
  failed: boolean;
  cancelled: boolean;
}

export interface OpenSpecConfig {
  changePrefix: string;
  createChangeCommand: string;
  statusCommand: string;
  applyCommand: string;
  handoffCommand: string;
}

export interface WorkflowConfig {
  openspec: OpenSpecConfig;
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
  baseDirectory?: string;
  remoteSessionMode: RemoteSessionMode;
}

export interface AppConfig {
  projectRoot: string;
  stateRoot: string;
  workspaceRoot: string;
  runsRoot: string;
  logsRoot: string;
  handoffsRoot: string;
  featuresRoot: string;
  retention: RetentionPolicy;
  workflow: WorkflowConfig;
  github: GitHubConfig;
  copilot: CopilotConfig;
}

export interface SpawnRequest {
  baseBranch?: string;
  features: string[];
}

export interface SpawnResult {
  runs: RunRecord[];
}

export const WORKFLOW_PHASES = [
  "queued",
  "preparing-workspace",
  "drafting-prd",
  "implementing",
  "handoff",
  "completed",
  "failed",
  "cancelled",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];
export type ActivePhase = Extract<
  WorkflowPhase,
  "queued" | "preparing-workspace" | "drafting-prd" | "implementing" | "handoff"
>;
