// Configuration manager that handles both Environment Variables and LocalStorage
export class ConfigManager {
  private static instance: ConfigManager;
  private readonly API_KEY_STORAGE_KEY = 'gymTracker_apiKey';

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getApiKey(): string {
    // 1. Prioridad: Variable de entorno (.env)
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (envApiKey && envApiKey.startsWith('sk-') && envApiKey !== 'sk-tu-llave-real-aqui') {
      return envApiKey;
    }

    // 2. Fallback: LocalStorage (lo que el usuario ingresó manualmente)
    return localStorage.getItem(this.API_KEY_STORAGE_KEY) || '';
  }

  public setApiKey(key: string): void {
    if (key && key.startsWith('sk-')) {
      localStorage.setItem(this.API_KEY_STORAGE_KEY, key);
    }
  }

  public hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }
}

export default ConfigManager;