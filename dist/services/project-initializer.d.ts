export declare class ProjectInitializer {
    private readonly projectRoot;
    constructor(projectRoot?: string);
    getStateRoot(): string;
    isInitialized(): Promise<boolean>;
    assertInitialized(): Promise<void>;
    initialize(configPath?: string): Promise<void>;
    private copyExampleConfig;
    private syncGitIgnore;
}
