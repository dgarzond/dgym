# Cómo desplegar DGym en Replit

## Pasos para configurar en Replit:

### 1. Subir el código a Replit

**Opción A: Desde GitHub (Recomendado)**
1. En Replit, crea un nuevo Repl
2. Selecciona "Import from GitHub"
3. Ingresa la URL de tu repositorio: `https://github.com/dgarzond/dgym`
4. Replit clonará automáticamente el repositorio

**Opción B: Subir archivos manualmente**
1. Crea un nuevo Repl en Replit
2. Sube todos los archivos del proyecto (excepto `node_modules` y archivos `.env`)

### 2. Instalar dependencias

Una vez que el código esté en Replit, ejecuta en la terminal:

```bash
npm install
```

Esto instalará todas las dependencias necesarias, incluyendo `dotenv`, `express`, `pg`, etc.

### 3. Configurar variables de entorno

En Replit, ve a la sección "Secrets" (🔒) y agrega:

- `DATABASE_URL`: Tu URL de conexión a PostgreSQL
- `VITE_GOOGLE_CLIENT_ID`: Tu Google OAuth Client ID (opcional)
- `VITE_OPENAI_API_KEY`: Tu OpenAI API Key (opcional)

**Nota:** En Replit, las variables de entorno se configuran en "Secrets", no en archivos `.env`.

### 4. Ejecutar el servidor

**⚠️ IMPORTANTE: Para deployment en Replit, NO uses comandos con "dev"**

Para desarrollo local (solo en tu máquina):
```bash
npm run dev:all      # Ejecuta frontend y backend en desarrollo
npm run dev:backend  # Solo backend en desarrollo
npm run dev:frontend # Solo frontend en desarrollo
```

Para producción/despliegue en Replit:
```bash
npm run build        # Compila el frontend primero
npm start            # Ejecuta el servidor de producción
```

O simplemente usa el botón "Run" en Replit, que ejecutará el workflow "Project" configurado en `.replit`.

### 5. Configurar el archivo .replit (si es necesario)

El archivo `.replit` ya está configurado, pero puedes verificar que tenga:

```toml
run = "npm start"
entrypoint = "server/production.ts"
```

### 6. Configurar la base de datos

Si usas la base de datos de Replit:
1. Ve a la pestaña "Database" en Replit
2. Crea una nueva base de datos PostgreSQL
3. Copia la URL de conexión
4. Agrégala como `DATABASE_URL` en Secrets

### 7. Ejecutar el frontend (opcional)

Si quieres correr el frontend también en Replit:

```bash
cd project
npm install
npm run dev
```

## Estructura del proyecto en Replit:

```
/
├── server/
│   ├── index.ts          # Servidor de desarrollo
│   └── production.ts     # Servidor de producción
├── project/
│   └── src/              # Código del frontend
├── package.json           # Dependencias del backend
└── .replit               # Configuración de Replit
```

## Solución de problemas:

### Error: Cannot find package 'dotenv'
**Solución:** Ejecuta `npm install` en la raíz del proyecto

### Error: Cannot find module 'pg'
**Solución:** Asegúrate de que `pg` esté en `package.json` y ejecuta `npm install`

### Error: DATABASE_URL no está configurada
**Solución:** Agrega `DATABASE_URL` en la sección "Secrets" de Replit

### El servidor no inicia
**Solución:** Verifica que el puerto esté disponible. Replit usa el puerto automáticamente asignado en `process.env.PORT`

