# Avance e investigación

## Objetivo del portal

Crear una web interna, breve y visual, para comunicar actualizaciones y documentos nuevos por país y cuenta. El agente podrá reconocer rápidamente su país, consultar el título del documento y abrir el Google Docs correspondiente para revisarlo o firmarlo.

No se plantea como un repositorio general de capacitación, plantillas o tareas internas del capacitador.

## Estado actual

- Experiencia de una sola pantalla, sin desplazamiento general.
- Navegación visual mediante modelos 3D diferenciados por país.
- Selección de Argentina, Chile, Colombia, Ecuador, México, Perú y Uruguay.
- Identidad visual, bandera y color propios por país.
- Panel con documentos asociados al país seleccionado.
- Acceso directo mediante enlaces externos a Google Docs.
- Datos almacenados localmente en `src/data.js` para facilitar las primeras pruebas.

Los archivos no se guardan dentro de esta web. Permanecen en Google Drive y el proyecto conserva únicamente sus datos de presentación y el enlace de acceso.

## Investigación de Capacitación Nodo Sur

El proyecto existente `CapacitacionNodoSur` ya se conecta con Google Sheets mediante una cuenta de servicio. Su servidor utiliza estas variables de entorno:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`

La hoja `Trabajo pendiente` contiene tanto tareas operativas como elementos de documentación. Entre sus campos aparece una columna de documento y prioridades como `Firmando` y `Solo documentación`.

El endpoint actual `GET /api/tareas` entrega todas las filas de esa hoja. Por este motivo no es adecuado conectarlo directamente al portal: filtrar en el navegador podría exponer tareas diarias u otra información que no corresponde compartir con agentes.

La sección de documentación del proyecto existente tampoco es una fuente directa equivalente: utiliza tablas PostgreSQL (`doc_folders` y `doc_items`) y responde a un propósito más amplio.

## Arquitectura recomendada para una etapa futura

Se puede conservar el mismo archivo de Google Sheets, pero creando una pestaña exclusiva llamada `Portal agentes`:

| Columna | Campo | Uso |
| --- | --- | --- |
| A | Publicar | `SÍ` o `NO`; controla si el registro puede mostrarse |
| B | País | País disponible en el portal |
| C | Cuenta | Cuenta o campaña destinataria |
| D | Título | Nombre visible del documento |
| E | URL | Enlace compartido de Google Docs |
| F | Estado | Por ejemplo: `Nuevo`, `Requiere firma`, `Actualizado` |
| G | Orden | Número para controlar la posición |

El servidor debería incorporar un endpoint específico, por ejemplo `GET /api/portal-documentos`, que lea solamente esa pestaña y devuelva únicamente las filas con `Publicar = SÍ`. La separación y el filtrado deben realizarse en el servidor, no en el navegador.

```text
Google Sheets · Portal agentes
              │
              ▼
GET /api/portal-documentos
  valida y filtra Publicar = SÍ
              │
              ▼
Portal interno por país y cuenta
              │
              ▼
Google Docs para revisión o firma
```

## Etapa actual: prueba con carga manual

Por ahora no se conectará ninguna base de datos ni Google Sheets. Cada publicación se agregará manualmente en `src/data.js`, siguiendo la guía `docs/CARGA-MANUAL.md`.

Esta modalidad permite validar primero:

- si la navegación por país resulta clara;
- qué información necesita ver realmente el agente;
- cómo conviene ordenar cuentas y documentos;
- qué estados son útiles;
- si los permisos de Google Docs funcionan con usuarios reales.

## Próximos pasos

1. Cargar algunos documentos reales de prueba de distintos países y cuentas.
2. Validar los enlaces y permisos usando una cuenta de agente.
3. Recoger comentarios sobre títulos, estados y orden de lectura.
4. Ajustar el modelo manual si aparece algún campo necesario.
5. Cuando el flujo esté validado, crear la pestaña `Portal agentes`.
6. Implementar el endpoint dedicado y reemplazar gradualmente la fuente local.
7. Añadir control de acceso si el enlace de la web no debe quedar disponible públicamente.

