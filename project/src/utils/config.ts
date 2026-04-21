// Configuration manager (deprecated).
//
// SECURITY: Never read/store OpenAI API keys in the browser.
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
    return '';
  }

  public setApiKey(key: string): void {
    void key;
  }

  public hasApiKey(): boolean {
    return false;
  }
}

export default ConfigManager;