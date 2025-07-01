
// Simple encryption/decryption utilities for API key storage
const STORAGE_KEY = 'fitness_app_config';
const ENCRYPTION_KEY = 'fitness_coach_2024_secure_key';

// Simple XOR encryption for basic obfuscation
function simpleEncrypt(text: string, key: string): string {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(textChar ^ keyChar);
  }
  return btoa(encrypted); // Base64 encode
}

function simpleDecrypt(encryptedText: string, key: string): string {
  try {
    const encrypted = atob(encryptedText); // Base64 decode
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const encChar = encrypted.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(encChar ^ keyChar);
    }
    return decrypted;
  } catch (error) {
    return '';
  }
}

export class ConfigManager {
  private static instance: ConfigManager;
  private apiKey: string = '';

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    try {
      // Priorizar variable de entorno de Replit Secrets
      const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (envApiKey && envApiKey.startsWith('sk-')) {
        this.apiKey = envApiKey;
        return;
      }

      // Fallback a localStorage si no hay variable de entorno
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        if (config.encryptedApiKey) {
          this.apiKey = simpleDecrypt(config.encryptedApiKey, ENCRYPTION_KEY);
        }
      }
    } catch (error) {
      console.warn('Error loading config:', error);
    }
  }

  private saveConfig(): void {
    try {
      const config = {
        encryptedApiKey: this.apiKey ? simpleEncrypt(this.apiKey, ENCRYPTION_KEY) : '',
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Error saving config:', error);
    }
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.saveConfig();
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public hasApiKey(): boolean {
    return this.apiKey.length > 0 && this.apiKey.startsWith('sk-');
  }

  public clearApiKey(): void {
    this.apiKey = '';
    localStorage.removeItem(STORAGE_KEY);
  }
}

export default ConfigManager;
