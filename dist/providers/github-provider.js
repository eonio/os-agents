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
    resolveRepository(input) {
        const parsed = parseGitHubRepository(input);
        if (parsed) {
            const cloneUrl = this.config.github.preferSsh
                ? `git@github.com:${parsed.owner}/${parsed.name}.git`
                : `https://github.com/${parsed.owner}/${parsed.name}.git`;
            return {
                input,
                cloneUrl,
                owner: parsed.owner,
                name: parsed.name,
                provider: "github",
            };
        }
        if (input.startsWith("git@") || input.startsWith("http://") || input.startsWith("https://")) {
            return {
                input,
                cloneUrl: input,
                provider: "git",
            };
        }
        return {
            input,
            cloneUrl: input,
            provider: "local",
        };
    }
    async buildHandoff(run) {
        const effectiveWorkspacePath = run.team?.finalWorkspacePath ?? run.workspacePath;
        const commitSha = await this.resolveCommitSha(effectiveWorkspacePath);
        return {
            runId: run.id,
            kind: run.kind,
            repository: run.repository.owner && run.repository.name
                ? `${run.repository.owner}/${run.repository.name}`
                : run.repository.input,
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
        if (!run.repository.owner || !run.repository.name) {
            return {
                status: "skipped",
                detail: "Repository is not a GitHub owner/repo target; repository_dispatch was skipped.",
            };
        }
        if (!this.config.github.token) {
            return {
                status: "skipped",
                detail: "GITHUB_TOKEN is not configured; handoff artifact was written locally only.",
            };
        }
        const response = await fetch(`${this.config.github.apiBaseUrl}/repos/${run.repository.owner}/${run.repository.name}/dispatches`, {
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
            throw new Error(`GitHub repository_dispatch failed (${response.status}): ${body || response.statusText}`);
        }
        return {
            status: "published",
            detail: `Published ${this.config.github.dispatchEventType} to ${run.repository.owner}/${run.repository.name}.`,
        };
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