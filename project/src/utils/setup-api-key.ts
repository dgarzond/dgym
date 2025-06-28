
// TEMPORAL: Ejecuta este archivo una vez para guardar tu API key
// Luego puedes eliminar este archivo

import { ConfigManager } from './config';

// Tu API key actual
const YOUR_API_KEY = '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';

export function setupApiKey() {
  const configManager = ConfigManager.getInstance();
  configManager.setApiKey(YOUR_API_KEY);
  console.log('✅ API Key guardada y encriptada correctamente');
  console.log('🔒 La clave está almacenada de forma segura en localStorage');
  console.log('📝 Ahora puedes eliminar este archivo setup-api-key.ts');
}

// Ejecuta automáticamente cuando se importa
setupApiKey();
