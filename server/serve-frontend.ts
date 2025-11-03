
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Add security headers for Google Sign-In
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Permissions-Policy', 'identity-credentials-get=*, publickey-credentials-get=*, browsing-topics=()');
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../project/dist')));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../project/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Frontend server running on port ${PORT} with COOP headers`);
});
