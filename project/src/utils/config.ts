// Configuration manager that uses only environment variables
export class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getApiKey(): string {
    // Only use environment variables - never store keys in code
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    return envApiKey || '';
  }

  public setApiKey(key: string): void {
    // This method should not store keys permanently
    // It's only for temporary session use
    console.warn('API key should be set via environment variables');
  }

  public hasApiKey(): boolean {
    const apiKey = this.getApiKey();
    return apiKey.length > 0;
  }
}

export default ConfigManager;