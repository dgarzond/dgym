# Cómo compilar la aplicación DGym

## Compilación del Frontend

El frontend se compila usando Vite. Los archivos compilados se generan en `project/dist/`.

### Compilar solo el frontend:

```bash
npm run build:frontend
```

O desde la carpeta `project`:

```bash
cd project
npm run build
```

### Compilar todo (frontend completo):

```bash
npm run build
```

O:

```bash
npm run build:all
```

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

1. **El backend no necesita compilación**: Se ejecuta directamente con `tsx` (TypeScript Execute)
2. **El frontend SÍ necesita compilación**: Vite compila React/TypeScript a JavaScript optimizado
3. **Replit**: El archivo `.replit` ya está configurado para compilar automáticamente antes de desplegar

## Verificar la compilación

Después de compilar, verifica que exista el directorio:

```bash
ls -la project/dist/
```

Deberías ver archivos como:
- `index.html`
- `assets/` (con archivos JS y CSS compilados)

