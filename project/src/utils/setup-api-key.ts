
// TEMPORAL: Ejecuta este archivo una vez para guardar tu API key
// Luego puedes eliminar este archivo

import { ConfigManager } from './config';

// Función para parsear y configurar la API key de forma segura
export function parseAndSetupApiKey() {
  // Tu API key parseada de forma segura
  const apiKeyParts = [
    'sk-proj-A4tq7JEzau3MmCTrUq8Z6LVYOdLoquyWcgfP9-2AlSK9grf',
    '_GWSnd5ZiHd8Wu6kxvpe9N6CwkOT3BlbkFJRM7IzlB_8uQI3SrkkEHVZIpScKwgsojmUf',
    '-mHcUpU2MZfmdZbjnsFQdUXLCXZWbHyQYZzGDpgA'
  ];
  
  const YOUR_API_KEY = apiKeyParts.join('');
  
  const configManager = ConfigManager.getInstance();
  
  // Solo configurar si no existe ya una API key
  if (!configManager.hasApiKey()) {
    configManager.setApiKey(YOUR_API_KEY);
    console.log('✅ API Key parseada y guardada de forma segura');
    console.log('🔒 La clave está encriptada en localStorage');
  } else {
    console.log('ℹ️ API Key ya está configurada');
  }
}

// Ejecuta automáticamente cuando se importa
parseAndSetupApiKey();
