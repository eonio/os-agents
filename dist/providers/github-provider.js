import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "../utils/process.js";
function parseGitHubRepository(input) {
    const ownerRepoMatch = input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (ownerRepoMatch) {
        return { owner: ownerRepoMatch[1], name: ownerRepoMatch[2].replace(/\.git$/, "") };
    }
    const urlMatch = input.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/)?$/i);
    if (urlMatch) {
        return { owner: urlMatch[1], name: urlMatch[2] };
    }
    return undefined;
}
export class GitHubProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async buildHandoff(run) {
        const effectiveWorkspacePath = run.workspacePath;
        const commitSha = await this.resolveCommitSha(effectiveWorkspacePath);
        const repository = await this.resolveGitHubRepository(effectiveWorkspacePath);
        return {
            runId: run.id,
            kind: run.kind,
            projectRoot: this.config.projectRoot,
            githubRepository: repository ? `${repository.owner}/${repository.name}` : undefined,
            baseBranch: run.baseBranch,
            featureBranch: run.featureBranch,
            feature: run.feature,
            workspacePath: effectiveWorkspacePath,
            summary: run.summary,
            status: run.status,
            phase: run.phase,
            sessionId: run.integration.copilotSessionId,
            commitSha,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            parentRunId: run.parentRunId,
            personaId: run.personaId,
            workflow: run.workflow,
            team: run.team,
            prd: run.prd,
        };
    }
    async writeHandoff(run) {
        const handoff = await this.buildHandoff(run);
        await mkdir(path.dirname(run.handoffPath), { recursive: true });
        await writeFile(run.handoffPath, JSON.stringify(handoff, null, 2), "utf8");
        return handoff;
    }
    async publishHandoff(run) {
        const handoff = await this.writeHandoff(run);
        const repository = await this.resolveGitHubRepository(run.workspacePath);
        if (!repository) {
            return {
                status: "skipped",
                detail: "No GitHub origin remote was found; repository_dispatch was skipped.",
            };
        }
        if (!this.config.github.token) {
            return {
                status: "skipped",
                detail: "GITHUB_TOKEN is not configured; handoff artifact was written locally only.",
            };
        }
        const response = await fetch(`${this.config.github.apiBaseUrl}/repos/${repository.owner}/${repository.name}/dispatches`, {
            method: "POST",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${this.config.github.token}`,
                "Content-Type": "application/json",
                "User-Agent": "os-agents",
            },
            body: JSON.stringify({
                event_type: this.config.github.dispatchEventType,
                client_payload: handoff,
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            return {
                status: "failed",
                detail: `GitHub repository_dispatch failed (${response.status}): ${body || response.statusText}`,
            };
        }
        return {
            status: "published",
            detail: `Published ${this.config.github.dispatchEventType} to ${repository.owner}/${repository.name}.`,
        };
    }
    async resolveGitHubRepository(workspacePath) {
        for (const candidate of [workspacePath, this.config.projectRoot]) {
            try {
                const result = await execFile("git", ["remote", "get-url", "origin"], { cwd: candidate });
                const parsed = parseGitHubRepository(result.stdout.trim());
                if (parsed) {
                    return parsed;
                }
            }
            catch {
                // Keep checking the next candidate.
            }
        }
        return undefined;
    }
    async resolveCommitSha(workspacePath) {
        try {
            const result = await execFile("git", ["rev-parse", "HEAD"], { cwd: workspacePath });
            return result.stdout.trim();
        }
        catch {
            return undefined;
        }
    }
}
//# sourceMappingURL=github-provider.js.map