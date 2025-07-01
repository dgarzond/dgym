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
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    return envApiKey || '';
  }

  public hasApiKey(): boolean {
    const apiKey = this.getApiKey();
    return apiKey.length > 0;
  }
}

export default ConfigManager;