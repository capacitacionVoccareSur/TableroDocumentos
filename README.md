# Portal interno · Capacitación Nodo Sur

Portal visual interno para publicar, por país y cuenta, documentos de Google Docs que los agentes deben revisar o firmar.

## Uso local

El servidor usa el puerto fijo **5175**: `http://localhost:5175/`. Si ya está ocupado, Vite avisa en lugar de abrir otra instancia con otra dirección.

La interfaz es un tablero de corcho en 3D. Consultar [el diseño, los materiales y la verificación](docs/TABLERO-3D.md).

```bash
npm install
npm run dev
```

Para acceder desde otra computadora en la misma red: `npm run dev -- --host 0.0.0.0`, y abrir la dirección Network que informa Vite.

## Configuración de Google Sheets

Los documentos se sincronizan con un Google Sheet vía Apps Script. Configurar la variable de entorno antes de levantar el servidor:

```bash
# .env.local (no subir a git)
VITE_SHEETS_URL=https://script.google.com/macros/s/TU_ID/exec
```

Ver instrucciones completas de configuración en [`docs/APPS-SCRIPT.md`](docs/APPS-SCRIPT.md).

## Carga de documentos

Hay dos formas de agregar documentos al tablero:

1. **Desde el portal**: botón "+ Documento" en el tablero — se guarda directamente en el Google Sheet y aparece en todos los navegadores al recargar.
2. **Directamente en el sheet**: agregar una fila manualmente con las columnas `country`, `account`, `title`, `url`, `status`.

Sin `VITE_SHEETS_URL` configurado, los documentos se guardan en `localStorage` del navegador (solo visibles en esa máquina).

## Verificación

```bash
npm run build
```
