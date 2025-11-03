
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const distPath = path.join(__dirname, '../project/dist');

// Verificar que el directorio dist existe
if (!fs.existsSync(distPath)) {
  console.error(`❌ Error: El directorio ${distPath} no existe`);
  console.error('Por favor ejecuta "cd project && npm run build" primero');
  process.exit(1);
}

console.log(`📁 Sirviendo archivos desde: ${distPath}`);

// Add security headers for Google Sign-In
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Permissions-Policy', 'identity-credentials-get=*, publickey-credentials-get=*, browsing-topics=()');
  next();
});

// Serve static files
app.use(express.static(distPath));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found. Please build the project first.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Frontend server running on http://0.0.0.0:${PORT}`);
  console.log(`📂 Serving files from: ${distPath}`);
  console.log(`🔒 COOP headers enabled for Google Sign-In`);
});
