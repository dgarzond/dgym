# Cómo compilar la aplicación DGym

## Compilación de la Aplicación

### Compilar Frontend y Backend:

```bash
npm run build
```

O:

```bash
npm run build:all
```

Esto compilará:
- **Frontend**: Usando Vite, genera archivos en `project/dist/`
- **Backend**: Verifica el código TypeScript (no genera archivos, solo valida)

### Compilar solo el frontend:

```bash
npm run build:frontend
```

O desde la carpeta `project`:

```bash
cd project
npm run build
```

### Verificar solo el backend (TypeScript):

```bash
npm run build:backend
```

Esto verifica que el código TypeScript del backend esté correcto (no genera archivos compilados, ya que se ejecuta con `tsx`).

## Estructura después de compilar

Después de compilar, la estructura será:

```
dgym/
├── project/
│   └── dist/          # Archivos compilados del frontend
│       ├── index.html
│       ├── assets/
│       └── ...
├── server/
│   ├── index.ts       # Servidor de desarrollo
│   └── production.ts  # Servidor de producción (sirve archivos de dist/)
└── ...
```

## Ejecutar en producción

Una vez compilado, puedes ejecutar el servidor de producción que servirá tanto el backend como el frontend compilado:

```bash
npm start
```

O:

```bash
npm run server:prod
```

El servidor de producción:
- Sirve el backend en `/api/*`
- Sirve los archivos estáticos del frontend desde `project/dist/`
- Escucha en el puerto 5000 (o el configurado en `PORT`)

## Notas importantes

1. **El backend se ejecuta con `tsx`**: No genera archivos compilados, pero `build:backend` verifica que el código TypeScript esté correcto
2. **El frontend SÍ necesita compilación**: Vite compila React/TypeScript a JavaScript optimizado en `project/dist/`
3. **Replit**: El archivo `.replit` ya está configurado para compilar automáticamente antes de desplegar
4. **Producción**: El comando `npm start` ejecuta el servidor de producción que sirve tanto el backend como el frontend compilado

## Verificar la compilación

Después de compilar, verifica que exista el directorio:

```bash
ls -la project/dist/
```

Deberías ver archivos como:
- `index.html`
- `assets/` (con archivos JS y CSS compilados)

